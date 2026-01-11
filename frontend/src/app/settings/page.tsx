import SettingsView from "@/components/SettingsView";
import AuthGate from "@/components/AuthGate";

export default function SettingsPage() {
  return (
    <AuthGate>
      <SettingsView />
    </AuthGate>
  );
}