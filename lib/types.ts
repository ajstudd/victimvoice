export interface RequestType {
  id: string;
  _id: string;
  userId : string;
  title: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  severityLevel: 'low' | 'medium' | 'high' | 'critical';
  harassmentType: string;
  description: string;
  userAddress: string;
  phone: string;
  accusedPhone : string;
  accusedName: string;
  accusedAddress: string;
  evidence: Array<{
    type: 'screenshot' | 'video';
    url: string;
  }>;
  comments: Array<{
    id: number;
    sender: 'admin' | 'user';
    content: string;
    timestamp: string;
  }>;
}