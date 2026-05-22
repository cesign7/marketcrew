import { AlertTriangle, CalendarDays, CirclePause, Clock3, FileSearch, ShieldCheck } from "lucide-react";
import type { InboxBucketView } from "@/features/agenda-room/types";

const bucketIcon = {
  approval: ShieldCheck,
  season: CalendarDays,
  tracking: Clock3,
  evidence: FileSearch,
  hold: CirclePause,
  failure: AlertTriangle,
} satisfies Record<InboxBucketView["tone"], typeof ShieldCheck>;

type InboxBucketBarProps = {
  buckets: InboxBucketView[];
};

export function InboxBucketBar({ buckets }: InboxBucketBarProps) {
  return (
    <section className="bucket-bar" aria-label="결재함 버킷">
      {buckets.map((bucket) => {
        const Icon = bucketIcon[bucket.tone];
        return (
          <article className={`bucket-item bucket-${bucket.tone}`} key={bucket.id}>
            <div className="bucket-icon" aria-hidden="true">
              <Icon size={18} />
            </div>
            <div>
              <strong>{bucket.label}</strong>
              <p>{bucket.description}</p>
            </div>
            <span>{bucket.count}</span>
          </article>
        );
      })}
    </section>
  );
}
