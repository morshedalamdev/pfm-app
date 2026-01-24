"use client";

import { useState } from "react";
import { HouseIcon } from "lucide-react";
import { Field, FieldError, FieldLabel } from "../ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Progress } from "../ui/progress";
import { Slider } from "../ui/slider";

export default function BudgetInput({ custom = true }: { custom?: boolean }) {
  const [value, setValue] = useState([50]);
  return (
    <Field>
      <FieldLabel>Housing</FieldLabel>
      <InputGroup>
        <InputGroupInput placeholder="10,000.00" disabled={!custom} />
        <InputGroupAddon>
          <HouseIcon />
        </InputGroupAddon>
        <InputGroupAddon align="inline-end">20%</InputGroupAddon>
      </InputGroup>
      <div className="mt-2">
        {custom ? (
          <Slider defaultValue={[75]} max={100} step={1} className="" />
        ) : (
          <Progress value={value[0]} />
        )}
      </div>
      <FieldError />
    </Field>
  );
}
