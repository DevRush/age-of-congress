import { meanDobMs, medianDobMs } from '../../src/lib/age'
import type { Chamber, ChamberStats, Member } from '../../src/lib/types'

export const SEATS = { senate: 100, house: 435 } as const

function statsOf(voting: Member[], seats: number): ChamberStats {
  const dobs = voting.map((m) => m.dobMs)
  return { meanDobMs: meanDobMs(dobs), medianDobMs: medianDobMs(dobs), count: voting.length, seats }
}

export function chamberStats(members: Member[], chamber: Chamber): ChamberStats {
  return statsOf(members.filter((m) => m.chamber === chamber && m.isVoting), SEATS[chamber])
}

export function overallStats(members: Member[]): ChamberStats {
  return statsOf(members.filter((m) => m.isVoting), SEATS.senate + SEATS.house)
}

function votingOf(members: Member[], chamber: Chamber): Member[] {
  return members.filter((m) => m.chamber === chamber && m.isVoting)
}

export function rankOldest(members: Member[], chamber: Chamber, n = 10): Member[] {
  return votingOf(members, chamber)
    .sort((a, b) => a.dobMs - b.dobMs || a.bioguide.localeCompare(b.bioguide))
    .slice(0, n)
}

export function rankYoungest(members: Member[], chamber: Chamber, n = 10): Member[] {
  return votingOf(members, chamber)
    .sort((a, b) => b.dobMs - a.dobMs || a.bioguide.localeCompare(b.bioguide))
    .slice(0, n)
}

export function withRanks<T extends Member>(list: T[]): (T & { rank: number })[] {
  return list.map((m, i) => {
    let first = i
    while (first > 0 && list[first - 1].dobMs === m.dobMs) first--
    return { ...m, rank: first + 1 }
  })
}
