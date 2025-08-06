"use client";
import React from "react";

interface PTTAnimationProps {
  isActive: boolean;
  className?: string;
}

export default function PTTAnimation({
  isActive,
  className = "",
}: PTTAnimationProps) {
  if (!isActive) return null;

  return (
    <div className={`ptt-frame ${className}`}>
      <style jsx>{`
        @property --gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes ptt-rotation {
          0% {
            --gradient-angle: 0deg;
          }
          100% {
            --gradient-angle: 360deg;
          }
        }

        .ptt-frame {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 50;
          background: linear-gradient(
            var(--gradient-angle),
            rgba(0, 122, 255, 0.8),
            rgba(88, 86, 214, 0.8),
            rgba(255, 45, 85, 0.8),
            rgba(255, 159, 10, 0.8),
            rgba(48, 209, 88, 0.8),
            rgba(191, 90, 242, 0.8),
            rgba(0, 122, 255, 0.8)
          );
          animation: ptt-rotation 4s linear infinite;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: xor;
          -webkit-mask: linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          padding: 12px;
          border-radius: 10px;
          filter: blur(5px);
        }
      `}</style>
    </div>
  );
}
