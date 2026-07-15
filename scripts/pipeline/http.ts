export const USER_AGENT = 'AgeOfCongress/1.0 (https://ageofcongress.com; annas.rahman@gmail.com)'

export interface Fetched { status: number; contentType: string | null; body: Buffer }
export type Fetcher = (url: string) => Promise<Fetched>

export async function httpGet(url: string): Promise<Fetched> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  return { status: res.status, contentType: res.headers.get('content-type'), body: Buffer.from(await res.arrayBuffer()) }
}
