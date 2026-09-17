"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Input } from "@zeal/ui";
import { Search, UserPlus, MoreHorizontal, Check, X } from "lucide-react";

const mockHealers = [
  { id: "h1", name: "Dr. Meera Nair", email: "meera@example.com", specialty: "Psychology", status: "verified", rating: 4.7, consultations: 600 },
  { id: "h2", name: "Rajesh Sharma", email: "rajesh@example.com", specialty: "Astrology", status: "pending", rating: 4.9, consultations: 1200 },
];

export default function AdminHealersPage() {
  const [search, setSearch] = React.useState("");
  const filtered = mockHealers.filter(h => h.name.includes(search) || h.email.includes(search));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#5E4B8B] dark:text-white">Healers</h1>
        <Button variant="primary" size="sm">
          <UserPlus className="w-4 h-4 mr-1" /> Add Healer
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#B8A1D9]" />
          <Input placeholder="Search healers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card className="border-[#E1C5E7] dark:border-gray-700">
        <CardContent className="p-0">
          <table className="w-full">
            <thead className="bg-[#F4E8F7] dark:bg-gray-800">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Name</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Specialty</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Status</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Rating</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Consultations</th>
                <th className="text-left p-3 text-sm font-medium text-[#5E4B8B] dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1C5E7] dark:divide-gray-700">
              {filtered.map((healer) => (
                <tr key={healer.id} className="hover:bg-[#F4E8F7] dark:hover:bg-gray-800/50">
                  <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">{healer.name}</td>
                  <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">{healer.specialty}</td>
                  <td className="p-3 text-sm">
                    <Badge variant={healer.status === "verified" ? "success" : "warning"}>{healer.status}</Badge>
                  </td>
                  <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">⭐ {healer.rating}</td>
                  <td className="p-3 text-sm text-[#5E4B8B] dark:text-white">{healer.consultations}</td>
                  <td className="p-3 text-sm flex gap-1">
                    {healer.status === "pending" && (
                      <>
                        <Button variant="primary" size="sm"><Check className="w-4 h-4" /></Button>
                        <Button variant="danger" size="sm"><X className="w-4 h-4" /></Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
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
