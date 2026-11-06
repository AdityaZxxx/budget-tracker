"use client";

import { cn } from "cn";
import {
  Panel as ResizablePanelPrimitive,
  PanelGroup as ResizablePanelGroupPrimitive,
  PanelResizeHandle as ResizableHandlePrimitive,
  type PanelGroupProps,
  type PanelProps,
  type PanelResizeHandleProps,
} from "react-resizable-panels";

function ResizablePanelGroup({ className, ...props }: PanelGroupProps) {
  return (
    <ResizablePanelGroupPrimitive
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function ResizablePanel({ ...props }: PanelProps) {
  return <ResizablePanelPrimitive data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: PanelResizeHandleProps & {
  withHandle?: boolean;
}) {
  return (
    <ResizableHandlePrimitive
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-px items-center justify-center bg-border ring-offset-background after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden data-[panel-group-direction=horizontal]:h-px data-[panel-group-direction=horizontal]:w-full data-[panel-group-direction=horizontal]:after:left-0 data-[panel-group-direction=horizontal]:after:h-1 data-[panel-group-direction=horizontal]:after:w-full data-[panel-group-direction=horizontal]:after:translate-x-0 data-[panel-group-direction=horizontal]:after:-translate-y-1/2 [&[data-panel-group-direction=horizontal]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-6 w-1 shrink-0 rounded-lg bg-border" />
      )}
    </ResizableHandlePrimitive>
  );
}

export { ResizableHandle, ResizablePanel, ResizablePanelGroup };
