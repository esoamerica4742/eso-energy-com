export type EnodeConnectionStatus = 'connected' | 'syncing' | 'error' | 'offline';

export type EnodeLinkStatus = 'pending' | 'linked' | 'error' | 'disconnected';

export type EnodeDeviceType =
  | 'inverter'
  | 'charger'
  | 'battery'
  | 'vehicle'
  | 'hvac'
  | 'meter'
  | 'unknown';

export type EnodeDevice = {
  id: string;
  company_id: string;
  enode_device_id: string;
  enode_user_id: string;
  device_type: EnodeDeviceType;
  vendor: string | null;
  display_name: string | null;
  is_reachable: boolean;
  connection_status: EnodeConnectionStatus;
  production_rate_kw: number | null;
  charge_rate_kw: number | null;
  battery_level_pct: number | null;
  grid_power_kw: number | null;
  raw_state: Record<string, unknown>;
  last_seen_at: string | null;
  branch_id: string | null;
  created_at: string;
  updated_at: string;
};

export type EnodeLinkSessionResponse = {
  linkUrl: string;
  linkToken: string;
  enodeUserId: string;
  redirectUri: string;
};

export type EnodeDevicesResponse = {
  devices: EnodeDevice[];
};

export type EnodeDeviceResponse = {
  device: EnodeDevice;
  warning?: string;
};

export type EnodeTelemetryPoint = {
  production_kw: number;
  charge_kw: number;
  grid_kw: number;
  recorded_at: string;
};

export type EnodeTelemetryResponse = {
  points: EnodeTelemetryPoint[];
};

export type EnodeApiErrorBody = {
  error: string;
};
