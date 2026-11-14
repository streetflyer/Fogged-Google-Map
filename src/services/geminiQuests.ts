import { GoogleGenAI } from '@google/genai';
import { LatLng, Quest } from '../types/explorer';
import { computeDestinationPoint } from '../utils/geo';

interface AiQuestSuggestion {
  title: string;
  description: string;
  category: 'scout' | 'landmark' | 'fitness' | 'mystery';
  distanceMeters: number;
  bearingDegrees: number;
  targetName: string;
  hint: string;
  xpReward: number;
}

export async function generateAiNeighborhoodQuests(
  currentLocation: LatLng,
  existingCount: number = 0
): Promise<Quest[]> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    '';

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return generateProceduralQuests(currentLocation, existingCount);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the Game Master of a real-world outdoor exploration game called "TerraIncognita: Fog of War".
The player is currently standing at coordinates Latitude: ${currentLocation.lat.toFixed(6)}, Longitude: ${currentLocation.lng.toFixed(6)}.
The map around them is shrouded in dark fog of war that clears only as they physically walk through their neighborhood.

Create 3 exciting, immersive, outdoor exploration quests within walking distance (between 150 meters and 650 meters).
Each quest must motivate physical walking, curiosity about local streets, parks, murals, viewpoints, alleys, cafes, or architectural quirks.

Output ONLY a valid JSON array of 3 objects with this exact schema (no markdown formatting, no code fence, pure JSON):
[
  {
    "title": "string (Short catchy quest title, max 6 words)",
    "description": "string (1-2 sentences of thematic explorer flavor)",
    "category": "scout" | "landmark" | "fitness" | "mystery",
    "distanceMeters": number (between 180 and 650),
    "bearingDegrees": number (between 0 and 359),
    "targetName": "string (e.g. 'Canopy Green Overlook', 'Old Brick Lane Corner')",
    "hint": "string (1 helpful navigation clue)",
    "xpReward": number (between 100 and 250)
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '';
    const cleanJson = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const suggestions: AiQuestSuggestion[] = JSON.parse(cleanJson);

    return suggestions.map((s, idx) => {
      const targetLoc = computeDestinationPoint(
        currentLocation,
        s.distanceMeters,
        s.bearingDegrees
      );
      return {
        id: `ai_quest_${Date.now()}_${idx}`,
        title: s.title,
        description: s.description,
        category: s.category || 'landmark',
        targetLocation: targetLoc,
        targetName: s.targetName,
        radiusMeters: Math.max(35, Math.min(60, s.distanceMeters * 0.12)),
        xpReward: s.xpReward || 150,
        badgeIcon: s.category === 'fitness' ? 'Zap' : s.category === 'mystery' ? 'Compass' : 'MapPin',
        completed: false,
        isAiGenerated: true,
        hint: s.hint,
      };
    });
  } catch (err) {
    console.warn('Gemini AI quest generation fallback to procedural generator:', err);
    return generateProceduralQuests(currentLocation, existingCount);
  }
}

function generateProceduralQuests(center: LatLng, countOffset: number = 0): Quest[] {
  const templates = [
    {
      title: 'The Cartographer’s Secret Cache',
      description: 'An ancient guild waypoint is hidden beneath the impenetrable fog. Walk until the veil lifts.',
      category: 'mystery' as const,
      dist: 280,
      angle: (60 + countOffset * 85) % 360,
      xp: 140,
      icon: 'Compass',
      hint: 'Follow the radar signal into the unexplored block.',
    },
    {
      title: 'Cross-Town Stride: Sector Edge',
      description: 'Push the frontiers of your visible map by reaching the boundary crossroads.',
      category: 'fitness' as const,
      dist: 450,
      angle: (195 + countOffset * 70) % 360,
      xp: 175,
      icon: 'Zap',
      hint: 'A brisk 450-meter outdoor walk clears extensive fog.',
    },
    {
      title: 'Scouting the Unmapped Alley',
      description: 'Neighborhood folklore whispers of hidden street art in this corridor. Scout it out.',
      category: 'scout' as const,
      dist: 330,
      angle: (310 + countOffset * 95) % 360,
      xp: 130,
      icon: 'Eye',
      hint: 'Look for landmarks as the fog clears upon your approach.',
    },
  ];

  return templates.map((t, idx) => {
    const targetLoc = computeDestinationPoint(center, t.dist, t.angle);
    return {
      id: `proc_quest_${Date.now()}_${idx}`,
      title: t.title,
      description: t.description,
      category: t.category,
      targetLocation: targetLoc,
      targetName: `Sector ${String.fromCharCode(65 + ((idx + countOffset) % 26))} Waypoint`,
      radiusMeters: 45,
      xpReward: t.xp,
      badgeIcon: t.icon,
      completed: false,
      isAiGenerated: false,
      hint: t.hint,
    };
  });
}
