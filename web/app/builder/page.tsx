import ChatClient from './chat.client';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

async function getAvailableBricks() {
  try {
    const featuresDir = path.join(process.cwd(), 'src', 'features');
    const reservedDirectories = new Set(['domain', 'host', 'ui', 'host-contract']);
    const dirs = await fs.readdir(featuresDir, { withFileTypes: true });
    return dirs
      .filter(dirent => dirent.isDirectory() && !reservedDirectories.has(dirent.name) && !dirent.name.startsWith('_'))
      .map(dirent => dirent.name);
  } catch (e) {
    return [];
  }
}

export default async function BuilderPage() {
  const bricks = await getAvailableBricks();

  return (
    <div className="flex h-screen w-full bg-brico-paper text-brico-ink font-sans overflow-hidden brutal-grid relative">
      {/* Sidebar / Chat Interface */}
      <div className="w-[450px] shrink-0 flex flex-col z-20 border-r-4 border-brico-ink bg-brico-paper-2">
        <ChatClient />
      </div>
      
      {/* Main Content Area / Preview */}
      <div className="flex-1 flex flex-col relative z-10 bg-brico-paper">
        {/* Top Header */}
        <header className="h-24 flex items-center justify-between px-10 border-b-4 border-brico-ink bg-brico-yellow">
          <h1 className="text-4xl font-serif font-black tracking-tight text-brico-ink uppercase">
            Workspace Vault
          </h1>
          <div className="text-sm font-mono font-black text-brico-paper bg-brico-ink px-4 py-2 border-2 border-brico-ink uppercase shadow-brutal-sm">
            {bricks.length} {bricks.length === 1 ? 'MODULE' : 'MODULES'}
          </div>
        </header>

        {/* Content Explorer */}
        <div className="flex-1 p-10 overflow-y-auto">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {bricks.map((brick, i) => {
              const themes = [
                { bg: 'bg-brico-red', text: 'text-brico-paper' },
                { bg: 'bg-brico-blue', text: 'text-brico-paper' },
                { bg: 'bg-brico-green', text: 'text-brico-paper' },
                { bg: 'bg-brico-orange', text: 'text-brico-paper' },
              ];
              const theme = themes[i % themes.length]!;
              
              return (
                <div key={brick} className="bg-brico-paper-2 border-4 border-brico-ink rounded-none p-6 shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer relative group flex flex-col">
                  <div className="flex items-start justify-between mb-8">
                    <div className={`${theme.bg} border-2 border-brico-ink p-3 shadow-brutal-sm`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className={`w-8 h-8 ${theme.text}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-2 border-2 border-brico-ink px-2 py-1 bg-white">
                      <span className="w-2.5 h-2.5 bg-brico-green border border-brico-ink" />
                      <span className="text-[10px] font-mono font-black text-brico-ink uppercase tracking-widest">LIVE</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-serif font-black text-brico-ink capitalize mb-2">{brick.replace(/-/g, ' ')}</h3>
                  <p className="text-sm text-brico-ink-soft font-mono font-bold truncate mt-auto">{brick}</p>
                </div>
              );
            })}
          </div>

          {bricks.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="border-4 border-brico-ink bg-white p-12 shadow-brutal text-center max-w-md">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-24 h-24 text-brico-red mx-auto mb-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="text-3xl font-serif font-black text-brico-ink mb-4 uppercase">Vault Empty</h2>
                <p className="text-brico-ink font-mono font-bold text-lg">Initialize a build sequence in the forge to deploy the first module.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
