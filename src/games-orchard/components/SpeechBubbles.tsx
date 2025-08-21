"use client";
import React from "react";

export interface BubbleConfig {
  label: React.ReactNode;
  bubbleClassName?: string;
  labelClassName?: string;
  textClassName?: string;
}

export interface SpeechBubblesProps {
  latestHost?: string;
  latestUser?: string;
  isUserSpeaking?: boolean;
  speakingText?: string;
  userReadyPrefix?: string; // string to detect initial ready message
  userReadyHint?: string; // text to show when latestUser starts with ready prefix
  hostConfig: BubbleConfig;
  userConfig: BubbleConfig;
  emptyStateText: string;
  emptyStateClassName?: string;
}

export default function SpeechBubbles({
  latestHost,
  latestUser,
  isUserSpeaking,
  speakingText,
  userReadyPrefix = "Hello! I'm ready to play",
  userReadyHint = "Press mic to talk",
  hostConfig,
  userConfig,
  emptyStateText,
  emptyStateClassName,
}: SpeechBubblesProps) {
  const shouldShowUser = Boolean(latestUser) || Boolean(isUserSpeaking);

  const renderUserText = () => {
    if (isUserSpeaking) {
      return speakingText || "🎤 Speaking...";
    }
    if (latestUser && latestUser.startsWith(userReadyPrefix)) {
      return userReadyHint;
    }
    return latestUser || "";
  };

  return (
    <>
      {latestHost && (
        <div className="mb-4">
          <div className="flex justify-start">
            <div
              className={`rounded-2xl rounded-bl-none p-4 max-w-md ${
                hostConfig.bubbleClassName ?? ""
              }`.trim()}
            >
              <div
                className={`${
                  hostConfig.labelClassName ?? "text-sm mb-1"
                }`.trim()}
              >
                {hostConfig.label}
              </div>
              <div className={`${hostConfig.textClassName ?? ""}`.trim()}>
                {latestHost}
              </div>
            </div>
          </div>
        </div>
      )}

      {shouldShowUser && (
        <div className="mb-2">
          <div className="flex justify-end">
            <div
              className={`rounded-2xl rounded-br-none p-4 max-w-md ${
                userConfig.bubbleClassName ?? ""
              }`.trim()}
            >
              <div
                className={`${
                  userConfig.labelClassName ?? "text-sm mb-1"
                }`.trim()}
              >
                {userConfig.label}
              </div>
              <div className={`${userConfig.textClassName ?? ""}`.trim()}>
                {renderUserText()}
              </div>
            </div>
          </div>
        </div>
      )}

      {!latestHost && !shouldShowUser && (
        <div
          className={`${
            emptyStateClassName ?? "text-center text-gray-500 text-lg"
          }`.trim()}
        >
          {emptyStateText}
        </div>
      )}
    </>
  );
}
