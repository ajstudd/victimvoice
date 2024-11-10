"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Mock data - replace with actual API call
const MOCK_REQUESTS = [
  {
    id: "REQ001",
    phone: "+1234567890",
    status: "pending",
    createdAt: "2024-03-20",
    priority: "high",
    type: "harassment",
  },
  {
    id: "REQ002",
    phone: "+1987654321",
    status: "in_progress",
    createdAt: "2024-03-19",
    priority: "medium",
    type: "threat",
  },
  // Add more mock data as needed
];

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-500",
  in_progress: "bg-blue-500/10 text-blue-500",
  resolved: "bg-green-500/10 text-green-500",
  closed: "bg-gray-500/10 text-gray-500",
};

const priorityIcons = {
  high: <AlertCircle className="h-4 w-4 text-red-500" />,
  medium: <Clock className="h-4 w-4 text-yellow-500" />,
  low: <CheckCircle2 className="h-4 w-4 text-green-500" />,
};

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRequests = MOCK_REQUESTS.filter(
    (request) =>
      request.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">Admin Dashboard</span>
            </div>
            <Button variant="ghost" asChild>
              <Link href="/admin/login">Logout</Link>
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Support Requests</h1>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or phone number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              Export Data
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.id}</TableCell>
                  <TableCell>{request.phone}</TableCell>
                  <TableCell className="capitalize">{request.type}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {priorityIcons[request.priority as keyof typeof priorityIcons]}
                      <span className="capitalize">{request.priority}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        statusColors[
                          request.status as keyof typeof statusColors
                        ]
                      }
                    >
                      {request.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.createdAt}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link href={`/admin/requests/${request.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}