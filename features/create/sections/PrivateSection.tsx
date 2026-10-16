"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

/** In a team, on your own code: keep it to yourself (teams spec 6). */
export function PrivateSection({
  isPrivate,
  onChange,
}: {
  isPrivate: boolean;
  onChange: (isPrivate: boolean) => void;
}) {
  return (
    <Card aria-labelledby="private-heading">
      <CardHeader
        id="private-heading"
        title="Sharing"
        description="Your teammates see your codes unless you make one private."
      />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <Toggle
          label="Private"
          description="Only you can see this code."
          checked={isPrivate}
          onChange={onChange}
        />
      </div>
    </Card>
  );
}
