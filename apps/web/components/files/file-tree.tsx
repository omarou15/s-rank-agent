"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface TreeNode {
  name: string;
  type: "file" | "directory";
  path: string;
  children?: TreeNode[];
  extension?: string;
}

const ICONS: Record<string, string> = {
  directory: "\u{1F4C1}", ts: "\u{1F7E6}", tsx: "\u269B\uFE0F", js: "\u{1F7E8}",
  py: "\u{1F40D}", md: "\u{1F4DD}", json: "\u{1F4CB}", html: "\u{1F310}",
  css: "\u{1F3A8}", pdf: "\u{1F4D5}", csv: "\u{1F4CA}", default: "\u{1F4C4}",
};

function getIcon(n: TreeNode): string {
  if (n.type === "directory") return ICONS.directory;
  return ICONS[n.extension || ""] || ICONS.default;
}

function Node({ node, depth, sel, onSel }: { node: TreeNode; depth: number; sel: string | null; onSel: (p: string) => void }) {
  const [open, setOpen] = useState(depth < 1);
  const isDir = node.type === "directory";
  return (
    <div>
      <button onClick={() => { if (isDir) setOpen(!open); onSel(node.path); }}
        className={cn("w-full flex items-center gap-2 py-1 px-2 rounded text-xs transition-colors",
          sel === node.path ? "bg-srank-primary/10 text-srank-primary" : "text-srank-text-secondary hover:bg-srank-hover"
        )} style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        {isDir && <span className="text-[10px] text-srank-text-muted w-3">{open ? "\u25BC" : "\u25B6"}</span>}
        {!isDir && <span className="w-3" />}
        <span className="text-sm">{getIcon(node)}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {isDir && open && node.children?.sort((a, b) => a.type !== b.type ? (a.type === "directory" ? -1 : 1) : a.name.localeCompare(b.name))
        .map(c => <Node key={c.path} node={c} depth={depth + 1} sel={sel} onSel={onSel} />)}
    </div>
  );
}

export function FileTree({ tree, selectedPath, onSelect }: { tree: TreeNode[]; selectedPath: string | null; onSelect: (p: string) => void }) {
  return <div className="py-1">{tree.map(n => <Node key={n.path} node={n} depth={0} sel={selectedPath} onSel={onSelect} />)}</div>;
}
