
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Maximize, TerminalSquare, UploadCloud, FolderTree, Code2, Play, SaveIcon, Settings2 } from 'lucide-react';
// import { WebContainer } from '@stackblitz/webcontainer-api'; // Placeholder for WebContainer
// import Editor from '@monaco-editor/react'; // Or your preferred Monaco wrapper
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

export default function WebIdePage() {
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  // const webcontainerInstanceRef = useRef<WebContainer | null>(null);
  // const terminalRef = useRef<HTMLDivElement>(null);
  // const xtermRef = useRef<Terminal | null>(null);
  // const fitAddonRef = useRef<FitAddon | null>(null);
  // const [fileTree, setFileTree] = useState<any[]>([]); // Replace with actual file tree structure
  // const [currentFileContent, setCurrentFileContent] = useState<string>('');
  // const [currentFilePath, setCurrentFilePath] = useState<string>('');
  // const [previewUrl, setPreviewUrl] = useState<string>('');

  // Placeholder for WebContainer boot logic
  // useEffect(() => {
  //   async function bootWebContainer() {
  //     // const wc = await WebContainer.boot();
  //     // webcontainerInstanceRef.current = wc;
  //     // Load initial project files or example
  //     // Listen for server ready event: wc.on('server-ready', (port, url) => setPreviewUrl(url));
  //     // Read initial file tree: const files = await wc.fs.readdir('/', { withFileTypes: true });
  //   }
  //   // bootWebContainer();
  // }, []);

  // Placeholder for Xterm.js initialization
  // useEffect(() => {
  //   if (isTerminalOpen && terminalRef.current && !xtermRef.current && webcontainerInstanceRef.current) {
  //     // const term = new Terminal({ convertEol: true, cursorBlink: true, theme: { background: '#0f172a' /* slate-900 */ } });
  //     // const fit = new FitAddon();
  //     // term.loadAddon(fit);
  //     // term.open(terminalRef.current);
  //     // fit.fit();
  //     // xtermRef.current = term;
  //     // fitAddonRef.current = fit;

  //     // // Connect to WebContainer shell
  //     // const shellProcess = await webcontainerInstanceRef.current.spawn('jsh');
  //     // shellProcess.output.pipeTo(new WritableStream({
  //     //   write(data) { term.write(data); }
  //     // }));
  //     // term.onData(data => shellProcess.input.write(data));
  //   }
  //   // const handleResize = () => fitAddonRef.current?.fit();
  //   // window.addEventListener('resize', handleResize);
  //   // return () => window.removeEventListener('resize', handleResize);
  // }, [isTerminalOpen]);

  const handleFileClick = (path: string) => {
    console.log('File clicked (placeholder):', path);
    // Example: Load file content
    // if (webcontainerInstanceRef.current) {
    //   webcontainerInstanceRef.current.fs.readFile(path, 'utf-8').then(content => {
    //     setCurrentFileContent(content);
    //     setCurrentFilePath(path);
    //   });
    // }
  };

  const handleSaveFile = () => {
    // if (currentFilePath && webcontainerInstanceRef.current) {
    //   webcontainerInstanceRef.current.fs.writeFile(currentFilePath, currentFileContent);
    //   console.log('File saved (placeholder):', currentFilePath);
    //   alert('File saved (placeholder)');
    // }
    alert('Save file logic not yet implemented.');
  };

  const handleSubmitProject = async () => {
    console.log('Submit project (placeholder)');
    alert('Project submission logic not yet implemented.');
  };

  return (
    <div className="flex flex-col flex-grow bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
      {/* IDE Header */}
      <header className="flex items-center justify-between p-2.5 border-b border-slate-700 bg-slate-900 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" strokeWidth={1.5} />
          <h1 className="text-lg font-semibold text-slate-100">ZenTest IDE</h1>
        </div>
        <div className="flex items-center gap-2">
           <Button
            onClick={handleSaveFile}
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:bg-slate-700 hover:text-slate-100 px-2"
            title="Save Current File"
          >
            <SaveIcon className="mr-1.5 h-4 w-4" /> Save
          </Button>
          <Button
            onClick={handleSubmitProject}
            variant="outline"
            size="sm"
            className="btn-outline-subtle text-slate-200 border-slate-600 hover:bg-primary/20 hover:border-primary hover:text-primary px-2"
          >
            <UploadCloud className="mr-1.5 h-4 w-4" /> Submit Project
          </Button>
        </div>
      </header>

      {/* Main IDE Layout (Explorer, Editor, Preview) */}
      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer (Left Panel) */}
        <aside className="w-[240px] bg-slate-800/50 p-3 border-r border-slate-700 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600">
          <h2 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wider">
            <FolderTree className="h-4 w-4" /> File Explorer
          </h2>
          <div className="text-sm text-slate-300">
            <ul className="space-y-0.5">
              <li onClick={() => handleFileClick('index.html')} className="cursor-pointer hover:bg-slate-700/60 p-1.5 rounded text-xs flex items-center gap-1.5">index.html</li>
              <li onClick={() => handleFileClick('style.css')} className="cursor-pointer hover:bg-slate-700/60 p-1.5 rounded text-xs flex items-center gap-1.5">style.css</li>
              <li onClick={() => handleFileClick('script.js')} className="cursor-pointer hover:bg-slate-700/60 p-1.5 rounded text-xs flex items-center gap-1.5">script.js</li>
              <li>
                <span className="font-medium text-slate-300 p-1.5 text-xs flex items-center gap-1.5">src/</span>
                <ul className="pl-3 space-y-0.5 border-l border-slate-700/50 ml-2">
                  <li onClick={() => handleFileClick('src/app.js')} className="cursor-pointer hover:bg-slate-700/60 p-1.5 rounded text-xs flex items-center gap-1.5">app.js</li>
                  <li onClick={() => handleFileClick('src/components/Button.jsx')} className="cursor-pointer hover:bg-slate-700/60 p-1.5 rounded text-xs flex items-center gap-1.5">Button.jsx</li>
                </ul>
              </li>
               <li onClick={() => handleFileClick('package.json')} className="cursor-pointer hover:bg-slate-700/60 p-1.5 rounded text-xs flex items-center gap-1.5">package.json</li>
            </ul>
            <p className="mt-4 text-xs text-slate-500">File explorer content will be dynamically populated by the WebContainer.</p>
          </div>
        </aside>

        {/* Editor & Preview (Center & Right) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Code Editor Area */}
          <section className="flex-1 bg-slate-900/70 relative">
            {/* <Editor
              height="100%"
              defaultLanguage="javascript"
              value={currentFileContent}
              onChange={(value) => setCurrentFileContent(value || '')}
              theme="vs-dark" 
              path={currentFilePath}
            /> */}
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-lg pointer-events-none">
              Monaco Editor Area
            </div>
          </section>

          {/* Live Preview Area */}
          <section 
            className={`bg-slate-700/30 border-t border-slate-700 relative ${isTerminalOpen ? 'h-1/2' : 'h-2/5'}`}
            style={{ minHeight: '200px' }}
          >
            {/* <iframe
              src={previewUrl}
              title="Live Preview"
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            /> */}
             <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-lg pointer-events-none">
              <Play className="h-6 w-6 mr-2" /> Live Preview Area
            </div>
          </section>
        </div>
      </div>

      {/* Terminal Toggle & Panel (Bottom) */}
      <div className="shrink-0 bg-slate-900 border-t border-slate-700">
        <div className="flex justify-end p-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className="text-slate-300 hover:bg-slate-700 hover:text-slate-100 px-2"
          >
            <TerminalSquare className="mr-1.5 h-4 w-4" />
            {isTerminalOpen ? 'Close Terminal' : 'Open Terminal'}
          </Button>
        </div>
        {isTerminalOpen && (
          <div
            // ref={terminalRef}
            className="h-40 bg-black p-2 text-xs text-slate-200 font-mono overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600"
          >
            <p>&gt; Terminal placeholder. Xterm.js will mount here.</p>
            <p>&gt; Connect to WebContainer shell.</p>
            <p className="text-yellow-400">&gt; Example: npm install react</p>
          </div>
        )}
      </div>
    </div>
  );
}
