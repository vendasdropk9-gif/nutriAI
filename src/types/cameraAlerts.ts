export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  cameraIds: string[]; // empty array means applies to all
  enabled: boolean;
  actionType: 'modal_and_push' | 'push_only';
  triggerCondition: string;
  detectionType: 'motion' | 'restriction' | 'crowd' | 'uniform' | 'offline';
}

export interface CameraAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  cameraId: string;
  cameraName: string;
  location: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  timeAgo: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  confidenceScore: number;
  detectedObject?: string;
  isRead: boolean;
}
