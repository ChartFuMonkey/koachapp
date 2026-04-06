"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getProfile, updateProfile, getProfileDashboard } from "@/actions/profile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  full_name: string | null;
  email: string | undefined;
  date_of_birth: string | null;
  gender: string | null;
  height_cm: number | null;
};

type Dashboard = {
  targets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    steps: number | null;
    sleep: number | null;
  } | null;
  phase: { name: string; type: string | null; start_date: string } | null;
  start_date: string | null;
  start_weight: number | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);

  useEffect(() => {
    async function load() {
      const [profileResult, dashResult] = await Promise.all([
        getProfile(),
        getProfileDashboard(),
      ]);
      if (profileResult.data) setProfile(profileResult.data as Profile);
      if (dashResult.data) setDashboard(dashResult.data as Dashboard);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!profile?.full_name?.trim()) {
      toast.error("Ime je obavezno.");
      return;
    }
    setSaving(true);
    const result = await updateProfile({
      full_name: profile.full_name.trim(),
      height_cm: profile.height_cm,
      date_of_birth: profile.date_of_birth,
      gender: profile.gender,
    });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profil ažuriran!");
    }
    setSaving(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="size-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center text-gray-400">
        Profil nije pronađen.
      </div>
    );
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="mb-6 text-2xl font-bold">Profil</h1>

      {/* === Dashboard Section === */}
      {dashboard && (
        <div className="mb-6 space-y-4">
          {profile.full_name && (
            <p className="text-lg text-gray-300">
              {profile.full_name}
            </p>
          )}

          {dashboard.phase && (
            <Card size="sm">
              <CardContent>
                <p className="text-xs text-gray-500">Trenutna faza</p>
                <p className="text-base font-semibold">{dashboard.phase.name}</p>
                {dashboard.phase.type && (
                  <p className="text-sm text-gray-400">{dashboard.phase.type}</p>
                )}
              </CardContent>
            </Card>
          )}

          {dashboard.targets && (
            <Card size="sm">
              <CardContent>
                <p className="mb-2 text-xs text-gray-500">Ciljevi</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {dashboard.targets.calories != null && (
                    <div>
                      <span className="text-gray-400">Kalorije: </span>
                      <span className="font-medium">{dashboard.targets.calories} kcal</span>
                    </div>
                  )}
                  {dashboard.targets.protein != null && (
                    <div>
                      <span className="text-gray-400">Proteini: </span>
                      <span className="font-medium">{dashboard.targets.protein} g</span>
                    </div>
                  )}
                  {dashboard.targets.carbs != null && (
                    <div>
                      <span className="text-gray-400">UH: </span>
                      <span className="font-medium">{dashboard.targets.carbs} g</span>
                    </div>
                  )}
                  {dashboard.targets.fat != null && (
                    <div>
                      <span className="text-gray-400">Masti: </span>
                      <span className="font-medium">{dashboard.targets.fat} g</span>
                    </div>
                  )}
                  {dashboard.targets.steps != null && (
                    <div>
                      <span className="text-gray-400">Koraci: </span>
                      <span className="font-medium">{dashboard.targets.steps.toLocaleString()}</span>
                    </div>
                  )}
                  {dashboard.targets.sleep != null && (
                    <div>
                      <span className="text-gray-400">San: </span>
                      <span className="font-medium">{dashboard.targets.sleep} h</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {(dashboard.start_date || dashboard.start_weight) && (
            <Card size="sm">
              <CardContent>
                <div className="flex gap-6 text-sm">
                  {dashboard.start_date && (
                    <div>
                      <span className="text-gray-400">Početak:</span>
                      <span className="font-medium">
                        {new Date(dashboard.start_date + "T00:00").toLocaleDateString("hr-HR")}
                      </span>
                    </div>
                  )}
                  {dashboard.start_weight && (
                    <div>
                      <span className="text-gray-400">Početna težina:</span>
                      <span className="font-medium">{dashboard.start_weight} kg</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="border-t border-gray-800" />
        </div>
      )}

      {/* === Edit Profile Form === */}
      <h2 className="mb-4 text-lg font-semibold">Uredi profil</h2>

      <Card>
        <CardContent className="space-y-4 pt-2">
          <div>
            <Label htmlFor="full_name">Ime i prezime</Label>
            <Input
              id="full_name"
              value={profile.full_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
              className="h-11"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile.email || ""}
              disabled
              className="h-11 text-gray-500"
            />
          </div>

          <div>
            <Label htmlFor="dob">Datum rođenja</Label>
            <Input
              id="dob"
              type="date"
              value={profile.date_of_birth || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  date_of_birth: e.target.value || null,
                })
              }
              className="h-11"
            />
          </div>

          <div>
            <Label htmlFor="height">Visina (cm)</Label>
            <Input
              id="height"
              type="number"
              value={profile.height_cm ?? ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  height_cm: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className="h-11"
            />
          </div>

          <div>
            <Label>Spol</Label>
            <div className="mt-1 flex gap-2">
              {(["M", "F"] as const).map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={profile.gender === g ? "default" : "outline"}
                  className="h-11 min-w-[48px] px-4"
                  onClick={() => setProfile({ ...profile, gender: g })}
                >
                  {g === "M" ? "Muško" : "Žensko"}
                </Button>
              ))}
              {profile.gender && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-11"
                  onClick={() => setProfile({ ...profile, gender: null })}
                >
                  Poništi
                </Button>
              )}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 h-11 w-full text-base"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Spremam...
              </>
            ) : (
              "Spremi"
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="my-6 border-t border-gray-800" />

      <Button
        variant="outline"
        onClick={handleSignOut}
        disabled={signingOut}
        className="h-11 w-full text-base text-red-400 hover:text-red-300"
      >
        <LogOut className="mr-2 size-4" />
        {signingOut ? "Odjava..." : "Odjava"}
      </Button>
    </div>
  );
}
