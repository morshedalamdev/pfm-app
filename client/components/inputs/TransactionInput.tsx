"use client";

import { Fragment } from "react";
import { ChevronRightIcon } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { InputGroup, InputGroupTextarea } from "../ui/input-group";
import { Calendar } from "../ui/calendar";

type TransactionInputProps = {
  type?: "text" | "number" | "date" | "boolean" | "select";
  label: string;
  list: string[];
  value?: string | boolean | Date | undefined;
  onChange: (value: string | boolean | Date | undefined) => void;
  error?: boolean;
};

export default function TransactionInput({
  type,
  label,
  list,
  value,
  onChange,
  error,
}: TransactionInputProps) {
  const DrawerField = () => {
    switch (type) {
      case "text":
        return (
          <Fragment>
            <DrawerHeader>
              <DrawerTitle>{label}</DrawerTitle>
            </DrawerHeader>
            <div className="p-1.5 pb-3">
              <InputGroup className="border-input/15">
                <InputGroupTextarea placeholder="Type here.." />
              </InputGroup>
            </div>
          </Fragment>
        );
      case "number":
        return (
          <Fragment>
            <DrawerHeader>
              <DrawerTitle>{label}</DrawerTitle>
            </DrawerHeader>
            <div className="p-1.5 pb-3">
              <Input type="number" />
            </div>
          </Fragment>
        );
      case "date":
        return (
          <Fragment>
            <DrawerHeader className="hidden">
              <DrawerTitle>{label}</DrawerTitle>
            </DrawerHeader>
            <div className="p-1.5 pb-3 overflow-y-auto max-h-[calc(95svh-2rem)]">
              <DrawerClose asChild>
                <Calendar
                  mode="single"
                  selected={value as Date}
                  onSelect={(date) => {
                    onChange(date);
                  }}
                  className="max-w-sm w-full mx-auto text-black"
                />
              </DrawerClose>
            </div>
          </Fragment>
        );
      case "boolean":
        return (
          <Fragment>
            <DrawerHeader className="border-b border-input/15">
              <DrawerTitle>{label}?</DrawerTitle>
            </DrawerHeader>
            <ul className="text-black p-1.5">
              <li>
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    onClick={() => onChange(true)}
                    className={value ? "bg-black text-white" : ""}
                  >
                    Yes
                  </Button>
                </DrawerClose>
              </li>
              <li>
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    onClick={() => onChange(false)}
                    className={!value ? "bg-black text-white" : ""}
                  >
                    No
                  </Button>
                </DrawerClose>
              </li>
            </ul>
          </Fragment>
        );
      case "select":
        return (
          <Fragment>
            <DrawerHeader className="border-b border-input/15">
              <DrawerTitle>Select {label}</DrawerTitle>
            </DrawerHeader>
            <ul className="text-black p-1.5 overflow-y-auto">
              {list.map((item) => (
                <li key={item}>
                  <DrawerClose asChild>
                    <Button
                      variant="ghost"
                      onClick={() => onChange(item)}
                      className={value === item ? "bg-black text-white" : ""}
                    >
                      {item}
                    </Button>
                  </DrawerClose>
                </li>
              ))}
            </ul>
          </Fragment>
        );
      default:
        return (
          <Fragment>
            <DrawerHeader>
              <DrawerTitle>{label}</DrawerTitle>
            </DrawerHeader>
            <div className="p-1.5 pb-3">
              <Input placeholder="Type here..." className="border-input/15" />
            </div>
          </Fragment>
        );
    }
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="flex items-center justify-between rounded-md h-8">
          <p className={`font-bold ${error ? " text-destructive" : ""}`}>
            {label}
          </p>
          <p className="flex items-center gap-1.5 font-semibold text-muted-foreground">
            <span>{value && value.toString()}</span>
            <ChevronRightIcon className="size-4" />
          </p>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerField />
      </DrawerContent>
    </Drawer>
  );
}
