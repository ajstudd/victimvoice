import { RequestType } from "./types";

export const MOCK_REQUESTS = [
  {
    id: "REQ001",
    title: "Online Harassment Case",
    status: "in_progress",
    createdAt: "2024-03-20",
    priority: "high",
    type: "cyber_harassment",
    description: "I have been receiving threatening messages on social media platforms. The person has been constantly sending inappropriate content and making threats.",
    userAddress: "123 User St, City, State",
    accusedAddress: "456 Accused St, City, State",
    evidence: [
      { type: "screenshot", url: "https://evidence1.jpg" },
      { type: "video", url: "https://evidence2.mp4" },
    ],
    messages: [
      {
        id: 1,
        sender: "Admin",
        content: "We have reviewed your case and are taking immediate action. We recommend saving all future communications and avoiding direct contact with the accused.",
        timestamp: "2024-03-20 14:30",
      },
      {
        id: 2,
        sender: "User",
        content: "Thank you for the quick response. The situation has escalated and I've received more threatening messages.",
        timestamp: "2024-03-20 15:45",
      },
    ],
  },
  {
    id: "REQ002",
    title: "Workplace Harassment",
    status: "pending",
    createdAt: "2024-03-18",
    priority: "medium",
    type: "workplace_harassment",
    description: "Facing inappropriate behavior at workplace...",
    userAddress: "789 User Ave, City, State",
    accusedAddress: "321 Work St, City, State",
    evidence: [],
    messages: [],
  },
] as RequestType[];