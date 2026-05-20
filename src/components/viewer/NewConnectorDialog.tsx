import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useConnectorStore } from "@/stores";

type ConnectorType = "STAIRCASE" | "ELEVATOR" | "ESCALATOR";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
}

export function NewConnectorDialog({ open, onOpenChange, buildingId }: Props) {
  const [type, setType] = useState<ConnectorType>("STAIRCASE");
  const [keyName, setKeyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const startNewConnector = useConnectorStore((s) => s.startNewConnector);

  const handleSubmit = async () => {
    if (!keyName.trim()) return;
    await startNewConnector(buildingId, {
      connectorType: type,
      connectorKey: keyName.trim(),
      name: displayName.trim() || undefined,
    });
    setKeyName("");
    setDisplayName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 수직 연결</DialogTitle>
          <DialogDescription>
            type과 key를 지정. 생성 후 각 층의 3D 뷰에서 클릭으로 stop을 찍습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">타입</Label>
            <ToggleGroup
              type="single"
              value={type}
              onValueChange={(v) => v && setType(v as ConnectorType)}
              className="w-full"
            >
              <ToggleGroupItem value="STAIRCASE" className="flex-1 text-xs">계단</ToggleGroupItem>
              <ToggleGroupItem value="ELEVATOR" className="flex-1 text-xs">엘리베이터</ToggleGroupItem>
              <ToggleGroupItem value="ESCALATOR" className="flex-1 text-xs">에스컬레이터</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conn-key" className="text-xs">Key (필수, 중복 안됨)</Label>
            <Input
              id="conn-key"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="예: stair-A"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conn-name" className="text-xs">표시 이름 (선택)</Label>
            <Input
              id="conn-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 동쪽 계단"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={!keyName.trim()}>생성</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
