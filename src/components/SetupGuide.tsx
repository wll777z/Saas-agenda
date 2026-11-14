"use client";
import { Check, ArrowUpRight, Scissors, Clock, Link2 } from "lucide-react";
export default function SetupGuide({
  steps,
  onAction,
  compact = false,
}: {
  steps: { id: string; title: string; done: boolean }[];
  onAction: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <section
      className={"setup-guide " + (compact ? "compact" : "")}
      aria-label="Primeiros passos"
    >
      <div className="section-top">
        <div>
          <span className="eyebrow">PRIMEIROS PASSOS</span>
          <h2>Sua agenda pronta em três passos.</h2>
        </div>
        <span className="status">
          {steps.filter((s) => s.done).length} de 3
        </span>
      </div>
      <div className="setup-guide-steps">
        {steps.map((step, i) => {
          const I = [Scissors, Clock, Link2][i];
          return (
            <button key={step.id} onClick={() => onAction(step.id)}>
              <span className={"setup-step-icon " + (step.done ? "done" : "")}>
                {step.done ? <Check size={20} /> : <I size={20} />}
              </span>
              <span>
                <small>
                  0{i + 1} · {step.done ? "Configurado" : "Próximo passo"}
                </small>
                <b>{step.title}</b>
              </span>
              <ArrowUpRight size={17} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
