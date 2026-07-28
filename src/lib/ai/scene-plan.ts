import { generateText, Output } from "ai";
import { z } from "zod";
import { SCENE_PLAN_MODEL } from "@/lib/ai/models";

const scenePlanSchema = z.object({
  scenePrompt: z.string(),
  premiseLine: z.string(),
});

export interface ScenePlan {
  scenePrompt: string;
  premiseLine: string;
}

const STYLE_ANCHOR =
  "cinematic lighting, shallow depth of field, color grade matching a streaming title card, dramatic spotlight, subject's face and body structure must match the original photo exactly, pose and action can change to fit the scene";

export async function buildScenePlan(goalText: string): Promise<ScenePlan> {
  const { output } = await generateText({
    model: SCENE_PLAN_MODEL,
    output: Output.object({ schema: scenePlanSchema }),
    system: `You write image-generation prompts for a personal "streaming title card" poster. The poster and text over it should look like a Movie poster of JIO Hotstar. The user describes a life goal or dream; a photo of them in their current everyday setting will be edited so the background/scene — and the subject's pose/action — becomes the grand,cinematic version of that dream, while the person's actual identity stays intact: same face and body structure as the original photo, not a different-looking person.

Given the user's goal text, produce:
- scenePrompt: a detailed, concrete visual description of the new background/scene and what the subject is doing in it, matching their specific dream (not a generic category) — describe the setting, the subject's pose/action, lighting, crowd/audience if relevant, and atmosphere. End it with these style anchors verbatim: "${STYLE_ANCHOR}"
- premiseLine: one short, punchy, cinematic one-liner (under 60 characters) capturing their dream as a movie-poster tagline. Do not just restate the goal text verbatim.`,
    prompt: goalText,
  });

  return output;
}
