import { CampusApp } from "@/components/CampusApp";
import { RequireAuth } from "@/components/RequireAuth";

export default function HomePage() {
  return (
    <RequireAuth>
      <CampusApp />
    </RequireAuth>
  );
}
