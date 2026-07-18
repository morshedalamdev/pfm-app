"use client";

import type { ComponentProps } from "react";
import { Drawer as DrawerPrimitive } from "vaul";

function classes(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function Drawer({
  autoFocus = true,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root autoFocus={autoFocus} {...props} />;
}

export function DrawerTrigger(
  props: ComponentProps<typeof DrawerPrimitive.Trigger>,
) {
  return <DrawerPrimitive.Trigger {...props} />;
}

export function DrawerClose(
  props: ComponentProps<typeof DrawerPrimitive.Close>,
) {
  return <DrawerPrimitive.Close {...props} />;
}

export function DrawerOverlay({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      className={classes("drawer-overlay", className)}
      {...props}
    />
  );
}

export function DrawerContent({
  children,
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        className={classes("drawer-content", className)}
        {...props}
      >
        <DrawerPrimitive.Handle className="drawer-handle" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}

export function DrawerHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={classes("drawer-header", className)} {...props} />;
}

export function DrawerFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={classes("drawer-footer", className)} {...props} />;
}

export function DrawerTitle({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      className={classes("drawer-title", className)}
      {...props}
    />
  );
}

export function DrawerDescription({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      className={classes("drawer-description", className)}
      {...props}
    />
  );
}
