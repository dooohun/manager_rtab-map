import { test, expect } from "@playwright/test";

const SERVER = "http://localhost:8000";

async function getDefaultBuilding(): Promise<{ buildingId: string; name: string } | null> {
  const res = await fetch(`${SERVER}/api/v1/buildings`);
  if (!res.ok) return null;
  const list = (await res.json()) as Array<{ buildingId: string; name: string }>;
  return list[0] ?? null;
}

test.describe("manager_rtab-map smoke", () => {
  test("빌딩 목록 페이지가 렌더되고 빌딩 카드를 표시한다", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(`console.error: ${msg.text()}`);
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // header
    await expect(page.getByText("건물 관리")).toBeVisible({ timeout: 10000 });
    // 적어도 하나의 건물 카드가 보여야 (서버에 빌딩이 있다는 전제)
    await expect(page.getByText("2공학관").first()).toBeVisible({ timeout: 10000 });

    const fatal = consoleErrors.filter(
      (e) =>
        !/Download the React DevTools/.test(e) &&
        !/Vite/.test(e) &&
        // CORS는 별도 검증, 외부 chunk 404 같은 잡음 무시
        !/Failed to load resource/.test(e),
    );
    expect(fatal, fatal.join("\n")).toEqual([]);
  });

  test("빌딩 상세 페이지의 5개 탭이 렌더된다", async ({ page }) => {
    const b = await getDefaultBuilding();
    test.skip(!b, "서버에 빌딩이 하나도 없음");

    await page.goto(`/#/buildings/${b!.buildingId}`);
    await page.waitForLoadState("networkidle");

    for (const label of ["층", "POI", "수직연결", "로비", "3D"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible({ timeout: 10000 });
    }
  });

  test("수직연결 탭이 connector 목록 fetch를 시도한다 (200 또는 404)", async ({ page }) => {
    const b = await getDefaultBuilding();
    test.skip(!b, "no building");

    const responses: { url: string; status: number }[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/connectors")) responses.push({ url: r.url(), status: r.status() });
    });

    await page.goto(`/#/buildings/${b!.buildingId}`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "수직연결", exact: true }).click();
    await page.waitForTimeout(1500);

    expect(responses.length, "no /connectors request fired").toBeGreaterThan(0);
    // 200 means new controller deployed; 404 means docker not rebuilt yet
    for (const r of responses) {
      expect([200, 404]).toContain(r.status);
    }
  });

  test("로비 탭: 층 미선택 상태에서는 안내 표시, 3D에서 층 선택 후 areas fetch", async ({ page }) => {
    const b = await getDefaultBuilding();
    test.skip(!b, "no building");

    const responses: { url: string; status: number }[] = [];
    page.on("response", (r) => {
      if (r.url().includes("/polygons") || r.url().includes("/areas")) {
        responses.push({ url: r.url(), status: r.status() });
      }
    });

    await page.goto(`/#/buildings/${b!.buildingId}`);
    await page.waitForLoadState("networkidle");

    // 1) 로비 탭 직접 진입: 층 미선택 안내
    await page.getByRole("button", { name: "로비", exact: true }).click();
    await expect(page.getByText("3D 탭에서 층을 먼저 선택하세요")).toBeVisible({ timeout: 5000 });

    // 2) 3D 탭으로 가서 층 셀렉터에서 첫 층 선택 → /floors/{id}/areas 호출
    await page.getByRole("button", { name: "3D", exact: true }).click();
    await page.waitForTimeout(1500);
    const floorSelector = page.getByLabel("층 선택").first();
    await floorSelector.waitFor({ timeout: 5000 });
    await floorSelector.click();
    const firstOption = page.getByRole("option").first();
    await firstOption.waitFor({ timeout: 5000 });
    await firstOption.click();
    await page.waitForTimeout(2000);

    const sawAreas = responses.some((r) => /\/floors\/[^/]+\/areas/.test(r.url));
    expect(sawAreas, `expected /floors/{id}/areas request. got: ${JSON.stringify(responses)}`).toBe(true);
  });

  test("신규 mutation: 빌딩 두 개 생성 → batch delete → 404", async ({ request }) => {
    const tag = `e2e-${Date.now()}`;
    const created: string[] = [];
    for (const suffix of ["a", "b"]) {
      const res = await request.post(`${SERVER}/api/v1/buildings`, {
        data: { name: `${tag}-${suffix}`, description: "playwright batch delete test" },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.buildingId).toBeTruthy();
      created.push(body.buildingId);
    }

    const del = await request.delete(`${SERVER}/api/v1/buildings/batch`, { data: created });
    expect(del.status()).toBe(204);

    for (const id of created) {
      const got = await request.get(`${SERVER}/api/v1/buildings/${id}`);
      expect(got.status()).toBe(404);
    }
  });
});
