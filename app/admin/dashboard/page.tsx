"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx"; // Import the XLSX library
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
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RequestType } from "@/lib/types";

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
  critical: <AlertCircle className="h-4 w-4 text-purple-500" />,
};

export default function AdminDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [supportRequests, setSupportRequests] = useState<RequestType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/admin/login";
  };

  useEffect(() => {
    const fetchSupportRequests = async () => {
      try {
        setLoading(true);
        const response = await axios.get("/admin-support-requests", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
          },
        });
        setSupportRequests(response.data);
      } catch (err) {
        console.error("Error fetching support requests:", err);
        setError("Failed to load support requests. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSupportRequests();
  }, []);

  const filteredRequests = supportRequests.filter(
    (request) =>
      request._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.userId.includes(searchQuery) ||
      request.phone.includes(searchQuery)
  );

  const handleExport = () => {
    // Prepare data for export
    const data = filteredRequests.map((request) => ({
      "Phone": request.phone,
      "Request ID": request._id,
      "User ID": request.userId,
      "Type": request.harassmentType,
      "Priority": request.severityLevel,
      "Status": request.status,
      "Date": new Date(request.createdAt).toLocaleDateString(),
    }));

    // Create a new worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Create a new workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Support Requests");

    // Export the workbook to a file
    XLSX.writeFile(workbook, "SupportRequests.xlsx");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-semibold">Admin Dashboard</span>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              Logout
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
                placeholder="Search by ID, user ID, or Phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleExport}>
              Export Data
            </Button>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <div className="bg-card rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Phone</TableCell>
                  <TableHead>Request ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell className="font-medium">{request.phone}</TableCell>
                    <TableCell className="font-medium">{request._id}</TableCell>
                    <TableCell>{request.userId}</TableCell>
                    <TableCell className="capitalize">{request.harassmentType.replace("_", " ")}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {priorityIcons[request.severityLevel.toLowerCase() as 'high' | 'medium' | 'low' | 'critical']}
                        <span className="capitalize">{request.severityLevel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          statusColors[request.status.toLowerCase().replace(" ", "_") as 'pending' | 'in_progress' | 'resolved' | 'closed']
                        }
                      >
                        {request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/requests?id=${request._id}`}>
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </div>
  );
}
