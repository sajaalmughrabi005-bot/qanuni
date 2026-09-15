"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function LawyerSettingsPage() {
  const t = useTranslations("lawyer.settings");
  const [emailNotif, setEmailNotif] = useState(true);
  const [availability, setAvailability] = useState("available_today");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("notifications")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label>Email &amp; in-app notifications</Label>
          <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("availability")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available_today">Available today</SelectItem>
              <SelectItem value="available_this_week">Available this week</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
