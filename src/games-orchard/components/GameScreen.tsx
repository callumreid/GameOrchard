"use client";
import React from "react";

export interface GameScreenPTTProps {
  show: boolean;
  containerClassName?: string;
  label: string;
  isActive: boolean;
  buttonClassName?: string;
  idleIcon: React.ReactNode;
  activeIcon?: React.ReactNode;
  onPressStart: () => void;
  onPressEnd: () => void;
}

export interface GameScreenProps {
  backgroundClassName?: string;
  cardClassName?: string;
  headerLeft?: React.ReactNode;
  headerCenter?: React.ReactNode;
  headerRight?: React.ReactNode;
  speechAreaClassName?: string;
  children: React.ReactNode;
  ptt?: GameScreenPTTProps;
  footer?: React.ReactNode;
}

export default function GameScreen({
  backgroundClassName,
  cardClassName,
  headerLeft,
  headerCenter,
  headerRight,
  speechAreaClassName,
  children,
  ptt,
  footer,
}: GameScreenProps) {
  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center p-4 ${
        backgroundClassName ?? ""
      }`.trim()}
    >
      <div
        className={`rounded-lg p-6 max-w-4xl w-full mt-16 ${
          cardClassName ?? "bg-white shadow-lg"
        }`.trim()}
      >
        {(headerLeft || headerCenter || headerRight) && (
          <div className="flex justify-between items-center">
            <div className="min-w-[120px] flex-1 flex justify-start items-center">
              {headerLeft}
            </div>
            <div className="flex-1 flex justify-center items-center">
              {headerCenter}
            </div>
            <div className="min-w-[120px] flex-1 flex justify-end items-center">
              {headerRight}
            </div>
          </div>
        )}

        <div className={`mb-4 ${speechAreaClassName ?? ""}`.trim()}>
          {children}
        </div>
      </div>

      {ptt?.show && (
        <div className="fixed bottom-1/4 right-6 z-10">
          <div
            className={`rounded-full p-4 shadow-lg ${
              ptt.containerClassName ?? ""
            }`.trim()}
          >
            <div className="text-center">
              <div className="text-xs mb-1">{ptt.label}</div>
              <button
                onMouseDown={ptt.onPressStart}
                onMouseUp={ptt.onPressEnd}
                onMouseLeave={ptt.onPressEnd}
                onTouchStart={ptt.onPressStart}
                onTouchEnd={ptt.onPressEnd}
                className={`${
                  ptt.buttonClassName ??
                  "w-16 h-16 rounded-full border-4 transition-all duration-150"
                }`.trim()}
              >
                <div className="text-5xl">
                  {ptt.isActive ? ptt.activeIcon ?? "🔴" : ptt.idleIcon}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}
