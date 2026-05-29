import { motion } from "framer-motion";
import { Brain, Lightbulb } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { explainProfile, topTags } from "../lib/engagement";
import { Card } from "./ui";

// Explainable AI panel — converts behavioral signals into plain-English
// reasoning, building user trust in the recommendation system.
export function ExplainPanel() {
  const { state } = useSession();
  const lines = explainProfile(state);
  const tags = topTags(state, 5);
  const maxW = Math.max(...tags.map((t) => t.weight), 1);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-5 w-5 text-sky-400" />
        <h3 className="text-sm font-semibold text-white">Why these picks?</h3>
      </div>

      <ul className="space-y-2.5">
        {lines.map((l, i) => (
          <motion.li
            key={l}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-start gap-2 text-sm text-zinc-300"
          >
            <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <span>{l}</span>
          </motion.li>
        ))}
      </ul>

      {tags.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Aesthetic signature
          </p>
          {tags.map((t) => (
            <div key={t.tag} className="flex items-center gap-2">
              <span className="w-20 truncate text-xs capitalize text-zinc-400">
                {t.tag}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${(t.weight / maxW) * 100}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
