import { springApi } from "./client";
import type {
  ConnectorResponse,
  ConnectorStopResponse,
  ConnectorCreateRequest,
  ConnectorUpdateRequest,
  ConnectorStopRequest,
} from "@/types";

export async function listConnectors(buildingId: string): Promise<ConnectorResponse[]> {
  const { data } = await springApi.get<ConnectorResponse[]>(`/api/v1/buildings/${buildingId}/connectors`);
  return data;
}

export async function getConnector(connectorId: string): Promise<ConnectorResponse> {
  const { data } = await springApi.get<ConnectorResponse>(`/api/v1/connectors/${connectorId}`);
  return data;
}

export async function createConnector(
  buildingId: string,
  body: ConnectorCreateRequest,
): Promise<ConnectorResponse> {
  const { data } = await springApi.post<ConnectorResponse>(
    `/api/v1/buildings/${buildingId}/connectors`,
    body,
  );
  return data;
}

export async function updateConnector(
  connectorId: string,
  body: ConnectorUpdateRequest,
): Promise<ConnectorResponse> {
  const { data } = await springApi.put<ConnectorResponse>(`/api/v1/connectors/${connectorId}`, body);
  return data;
}

export async function deleteConnector(connectorId: string): Promise<void> {
  await springApi.delete(`/api/v1/connectors/${connectorId}`);
}

export async function addConnectorStop(
  connectorId: string,
  body: ConnectorStopRequest,
): Promise<ConnectorStopResponse> {
  const { data } = await springApi.post<ConnectorStopResponse>(
    `/api/v1/connectors/${connectorId}/stops`,
    body,
  );
  return data;
}

export async function updateConnectorStop(
  stopId: string,
  body: ConnectorStopRequest,
): Promise<ConnectorStopResponse> {
  const { data } = await springApi.put<ConnectorStopResponse>(
    `/api/v1/connector-stops/${stopId}`,
    body,
  );
  return data;
}

export async function removeConnectorStop(stopId: string): Promise<void> {
  await springApi.delete(`/api/v1/connector-stops/${stopId}`);
}
