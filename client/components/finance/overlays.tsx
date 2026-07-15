"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type OverlayAction = {
  label: React.ReactNode;
  onClick?: () => void;
};

function FooterActions({
  primaryAction,
  secondaryAction,
}: {
  primaryAction?: OverlayAction;
  secondaryAction?: OverlayAction;
}) {
  if (!primaryAction && !secondaryAction) return null;

  return (
    <>
      {secondaryAction ? (
        <Button onClick={secondaryAction.onClick} type="button" variant="outline">
          {secondaryAction.label}
        </Button>
      ) : null}
      {primaryAction ? (
        <Button onClick={primaryAction.onClick} type="button">
          {primaryAction.label}
        </Button>
      ) : null}
    </>
  );
}

export function AppDialog({
  children,
  description,
  primaryAction,
  secondaryAction,
  title,
  trigger,
}: {
  children?: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: OverlayAction;
  secondaryAction?: OverlayAction;
  title: React.ReactNode;
  trigger: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto p-0">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {children ? <div className="px-5 py-4">{children}</div> : null}
        <DialogFooter className="border-t border-border p-5">
          <FooterActions primaryAction={primaryAction} secondaryAction={secondaryAction} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppDrawer({
  children,
  description,
  primaryAction,
  secondaryAction,
  title,
  trigger,
}: React.ComponentProps<typeof AppDialog>) {
  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="bg-background text-foreground">
        <div className="max-h-[calc(95svh-env(safe-area-inset-bottom,0px))] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
          <DrawerHeader>
            <DrawerTitle className="text-foreground">{title}</DrawerTitle>
            {description ? (
              <DrawerDescription className="text-muted-foreground">
                {description}
              </DrawerDescription>
            ) : null}
          </DrawerHeader>
          {children ? <div className="py-3">{children}</div> : null}
          <DrawerFooter>
            <FooterActions primaryAction={primaryAction} secondaryAction={secondaryAction} />
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function AppSheet({
  children,
  description,
  primaryAction,
  secondaryAction,
  title,
  trigger,
}: React.ComponentProps<typeof AppDialog>) {
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="z-[var(--z-shell-overlay)] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        {children ? <div className="px-4 py-2">{children}</div> : null}
        <SheetFooter>
          <FooterActions primaryAction={primaryAction} secondaryAction={secondaryAction} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function ConfirmDialog({
  confirmLabel = "Confirm",
  description,
  onConfirm,
  title,
  trigger,
}: {
  confirmLabel?: React.ReactNode;
  description?: React.ReactNode;
  onConfirm?: () => void;
  title: React.ReactNode;
  trigger: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="bg-background text-foreground">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function DestructiveConfirmDialog(props: React.ComponentProps<typeof ConfirmDialog>) {
  return (
    <ConfirmDialog
      {...props}
      confirmLabel={props.confirmLabel ?? "Delete"}
    />
  );
}

export type ActionMenuItem = {
  destructive?: boolean;
  disabled?: boolean;
  label: React.ReactNode;
  onSelect?: () => void;
};

export function ActionMenu({
  items,
  label = "Actions",
  trigger,
}: {
  items: ActionMenuItem[];
  label?: string;
  trigger?: React.ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button aria-label={label} size="icon-sm" type="button" variant="ghost">
            <MoreHorizontal aria-hidden="true" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item, index) => (
          <DropdownMenuItem
            disabled={item.disabled}
            key={index}
            onSelect={item.onSelect}
            variant={item.destructive ? "destructive" : "default"}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ContextMenu({
  children,
  className,
  items,
}: {
  children: React.ReactNode;
  className?: string;
  items: ActionMenuItem[];
}) {
  return (
    <ActionMenu
      items={items}
      trigger={
        <button
          className={cn("w-full rounded-md text-left focus-visible:ring-2 focus-visible:ring-ring", className)}
          type="button"
        >
          {children}
        </button>
      }
    />
  );
}
