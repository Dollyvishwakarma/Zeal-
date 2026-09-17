"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@zeal/ui";
import { Flag, Check, X, Eye } from "lucide-react";

const mockFlagged = [
  { id: "f1", type: "post", content: "Spam message", reportedBy: "user1", status: "pending", createdAt: "2026-08-03" },
  { id: "f2", type: "comment", content: "Inappropriate comment", reportedBy: "user2", status: "resolved", createdAt: "2026-08-02" },
];

export default function AdminContentPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white">Content Moderation</h1>

      <Card className="border-[#E1C5E7] dark:border-gray-700">
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-[#F4E8F7] dark:bg-gray-800">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Type</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Content</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Reported By</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Status</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1C5E7] dark:divide-gray-700">
              {mockFlagged.map((item) => (
                <tr key={item.id} className="hover:bg-[#F4E8F7] dark:hover:bg-gray-800/50">
                  <td className="p-3 text-sm text-[#5E4B8B] dark:text-white"><Badge variant="outline">{item.type}</Badge></td>
                  <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">{item.content}</td>
                  <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">{item.reportedBy}</td>
                  <td className="p-3 text-sm">
                    <Badge variant={item.status === "pending" ? "warning" : "success"}>{item.status}</Badge>
                  </td>
                  <td className="p-3 text-sm flex gap-1">
                    <Button variant="primary" size="sm"><Eye className="w-4 h-4" /></Button>
                    <Button variant="success" size="sm"><Check className="w-4 h-4" /></Button>
                    <Button variant="danger" size="sm"><X className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
