/**
 * The chorale workbench (C26): one of Kittel's melodies harmonized in six stages (from the melody down, or from the bass up, C34)
 * (cadences, harmony, bass, figures, inner voices, diminution), each starting from the player's
 * answers to the stages before.
 */

/** The id under which stage 6 keeps the player's diminution of their own setting (above Bach's 370). */
export const workbenchId = (number: number, bassNo: number) => 10000 + number * 10 + bassNo;
