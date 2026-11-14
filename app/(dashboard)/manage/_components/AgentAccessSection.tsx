"use client";

import type { TokenScope } from "@/lib/types";
import type { Household } from "@prisma/client";
import type { ReactElement } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound, Loader2, TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import AddIconButton from "@/components/ui/add-icon-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  POLL_INTERVAL,
  READ_ONLY_SCOPE,
  READ_WRITE_SCOPE,
} from "@/lib/constants";

import {
  type ApiTokenSummary,
  createApiToken,
  listApiTokens,
  revokeApiToken,
  setAgentAccess,
} from "../_actions/api-tokens";

const todayDateValue = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

// The schema's own message for a past expiry.
const isFutureDate = (value: string) => !value || value >= todayDateValue();

const AgentAccessSection = ({ canEdit }: { canEdit: boolean }) => {
  const queryClient = useQueryClient();

  const { data: household } = useQuery<Household>({
    queryKey: ["household"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const enabled = household?.agentAccessEnabled ?? false;

  const accessMutation = useMutation({
    mutationFn: async (input: Parameters<typeof setAgentAccess>[0]) => {
      const res = await setAgentAccess(input);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async (_data, variables) => {
      toast.success(
        variables.enabled ? "Agent access enabled" : "Agent access turned off",
        { id: "agent-access" },
      );
      await queryClient.invalidateQueries({ queryKey: ["household"] });
      await queryClient.invalidateQueries({ queryKey: ["apiTokens"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to change agent access. Try again.",
        { id: "agent-access" },
      );
    },
  });

  return (
    <section>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Agent access</CardTitle>
          <CardDescription>
            Let an AI assistant or a script use Sora with a personal API token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Allow AI assistants and API access
              </p>
              <p className="text-sm text-muted-foreground">
                Off means no token can be created and every existing token stops
                working.
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(checked) =>
                accessMutation.mutate({ enabled: checked })
              }
              disabled={!canEdit || accessMutation.isPending}
              aria-label="Allow AI assistants and API access"
            />
          </div>

          {enabled && <ApiTokenList canEdit={canEdit} />}
        </CardContent>
      </Card>
    </section>
  );
};

const ApiTokenList = ({ canEdit }: { canEdit: boolean }) => {
  const queryClient = useQueryClient();

  const { data: tokens = [], isLoading } = useQuery<ApiTokenSummary[]>({
    queryKey: ["apiTokens"],
    queryFn: async () => {
      const res = await listApiTokens();
      if (!res.ok) throw new Error(res.message);
      return res.data ?? [];
    },
    staleTime: POLL_INTERVAL,
  });

  const revokeMutation = useMutation({
    mutationFn: async (input: Parameters<typeof revokeApiToken>[0]) => {
      const res = await revokeApiToken(input);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Token revoked", { id: "api-tokens" });
      await queryClient.invalidateQueries({ queryKey: ["apiTokens"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to revoke token. Try again.",
        { id: "api-tokens" },
      );
    },
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {tokens.length === 0
            ? "No tokens yet."
            : `${tokens.length} active ${tokens.length === 1 ? "token" : "tokens"}.`}
        </p>
        <CreateApiTokenDialog
          canEdit={canEdit}
          trigger={<AddIconButton label="Create token" />}
        />
      </div>

      {tokens.length > 0 && (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm font-medium">
                    {token.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {token.scope === READ_WRITE_SCOPE
                    ? "Read and write"
                    : "Read only"}
                  {" · "}
                  {token.user.name}
                  {token.expiresAt &&
                    ` · expires ${new Date(token.expiresAt).toLocaleDateString()}`}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate({ id: token.id })}
                      aria-label={`Revoke ${token.name}`}
                    />
                  }
                >
                  <TrashIcon />
                </TooltipTrigger>
                <TooltipContent>Revoke token</TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CreateApiTokenDialog = ({
  canEdit,
  trigger,
}: {
  canEdit: boolean;
  trigger: ReactElement;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scope, setScope] = useState<TokenScope>(READ_ONLY_SCOPE);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expiryError, setExpiryError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (input: Parameters<typeof createApiToken>[0]) => {
      const res = await createApiToken(input);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async (data) => {
      if (!data) return;
      setCreated(data.token);
      setName("");
      setScope(READ_ONLY_SCOPE);
      setExpiresAt("");
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["apiTokens"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error && mutationError.message
          ? mutationError.message
          : "Unable to create the token. Check the details and try again.",
      );
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter a name");
      return;
    }
    if (!isFutureDate(expiresAt)) {
      setExpiryError("Pick a future date");
      return;
    }

    setError(null);
    createMutation.mutate({
      name: name.trim(),
      scope,
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`) : undefined,
    });
  };

  const copyToken = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setCreated(null);
          setError(null);
          setExpiryError(null);
          setCopied(false);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Copy your token</DialogTitle>
              <DialogDescription>
                This token is shown once. Store it somewhere safe, because Sora
                keeps only its hash and cannot show it again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <code className="min-w-0 flex-1 truncate text-sm">{created}</code>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={copyToken}
                      aria-label={copied ? "Copied" : "Copy token"}
                    />
                  }
                >
                  {copied ? <Check /> : <Copy />}
                </TooltipTrigger>
                <TooltipContent>
                  {copied ? "Copied" : "Copy token"}
                </TooltipContent>
              </Tooltip>
            </div>
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create an API token</DialogTitle>
              <DialogDescription>
                The token lets an assistant act as you in this space. Revoke it
                any time to cut it off.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="token-name">Name</FieldLabel>
                <Input
                  id="token-name"
                  placeholder="Claude Desktop"
                  value={name}
                  maxLength={60}
                  aria-invalid={name.length >= 60}
                  aria-describedby={
                    name.length >= 60 ? "token-name-error" : undefined
                  }
                  onChange={(event) => setName(event.target.value)}
                />
                <FieldDescription className="text-xs sm:text-sm">
                  How you will recognise this token later
                </FieldDescription>
                {name.length >= 60 && (
                  <FieldError id="token-name-error">
                    Up to 60 characters
                  </FieldError>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="token-scope">Access</FieldLabel>
                <Select
                  value={scope}
                  onValueChange={(value) => {
                    if (value === null) return;
                    setScope(value as TokenScope);
                  }}
                  items={{
                    [READ_ONLY_SCOPE]: "Read only",
                    [READ_WRITE_SCOPE]: "Read and write",
                  }}
                >
                  <SelectTrigger id="token-scope" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={READ_ONLY_SCOPE}>Read only</SelectItem>
                    {canEdit && (
                      <SelectItem value={READ_WRITE_SCOPE}>
                        Read and write
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FieldDescription className="text-xs sm:text-sm">
                  {scope === READ_WRITE_SCOPE
                    ? "The assistant can add transactions, settle balances, and set budgets"
                    : "The assistant can read your ledger but cannot change it"}
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="token-expiry">Expires</FieldLabel>
                <Input
                  id="token-expiry"
                  type="date"
                  value={expiresAt}
                  min={todayDateValue()}
                  aria-invalid={Boolean(expiryError)}
                  aria-describedby={
                    expiryError ? "token-expiry-error" : undefined
                  }
                  onChange={(event) => {
                    setExpiresAt(event.target.value);
                    setExpiryError(
                      isFutureDate(event.target.value)
                        ? null
                        : "Pick a future date",
                    );
                  }}
                />
                <FieldDescription className="text-xs sm:text-sm">
                  Leave empty for a token that lasts until you revoke it
                </FieldDescription>
              </Field>

              {expiryError && (
                <FieldError id="token-expiry-error">{expiryError}</FieldError>
              )}
              {error && <FieldError>{error}</FieldError>}

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending ||
                    !name.trim() ||
                    Boolean(expiryError)
                  }
                  className="gap-2"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <KeyRound />
                  )}
                  Create token
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AgentAccessSection;
