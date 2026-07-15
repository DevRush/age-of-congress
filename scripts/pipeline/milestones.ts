export interface Milestone { id: string; noun: string; clause: string; date: string; source: string }

export const MILESTONES: Milestone[] = [
  { id: 'ballpoint', noun: 'the first ballpoint pen sold in America', clause: 'the first ballpoint pen went on sale in America', date: '1945-10-29', source: 'TIME; Reynolds Rocket at Gimbels, New York' },
  { id: 'transistor', noun: 'the invention of the transistor', clause: 'the transistor was invented at Bell Labs', date: '1947-12-16', source: 'Computer History Museum' },
  { id: 'polio', noun: 'the polio vaccine announcement', clause: 'the Salk polio vaccine was declared safe and effective', date: '1955-04-12', source: 'University of Michigan School of Public Health' },
  { id: 'sputnik', noun: 'the launch of Sputnik', clause: 'Sputnik reached orbit', date: '1957-10-04', source: 'U.S. State Department, Office of the Historian' },
  { id: 'nasa', noun: 'the founding of NASA', clause: 'NASA was created', date: '1958-07-29', source: 'NASA History Office' },
  { id: 'mlk', noun: 'the March on Washington', clause: 'Dr. King delivered "I Have a Dream"', date: '1963-08-28', source: 'National Archives' },
  { id: 'medicare', noun: 'the creation of Medicare', clause: 'Medicare was signed into law', date: '1965-07-30', source: 'U.S. Senate Historical Office' },
  { id: 'moon', noun: 'the Moon landing', clause: 'Apollo 11 landed on the Moon', date: '1969-07-20', source: 'NASA' },
  { id: 'arpanet', noun: 'the first Internet message', clause: 'the first ARPANET message was sent', date: '1969-10-29', source: 'UCLA Kleinrock Internet History Center' },
  { id: 'wall', noun: 'the fall of the Berlin Wall', clause: 'the Berlin Wall fell', date: '1989-11-09', source: 'U.S. State Department, Office of the Historian' },
  { id: 'web', noun: 'the public debut of the World Wide Web', clause: 'the World Wide Web was announced to the public', date: '1991-08-06', source: 'CERN' },
  { id: 'google', noun: 'the founding of Google', clause: 'Google was incorporated', date: '1998-09-04', source: 'EDN; California incorporation records' },
  { id: 'facebook', noun: 'the launch of Facebook', clause: 'Facebook launched', date: '2004-02-04', source: 'History of Facebook (Wikipedia)' },
  { id: 'iphone', noun: 'the iPhone', clause: 'the iPhone was announced', date: '2007-01-09', source: 'Apple Newsroom' },
]
