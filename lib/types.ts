export interface RequestType {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  description: string;
  userAddress: string;
  accusedAddress: string;
  evidence: Array<{
    type: 'screenshot' | 'video';
    url: string;
  }>;
  messages: Array<{
    id: number;
    sender: string;
    content: string;
    timestamp: string;
  }>;
}