import { useCallback, useRef } from "react";

export function useToastAliasing() {
  const aliasMapRef = useRef<Map<string, string>>(new Map());

  const resolveToastId = useCallback((id: string): string => {
    let currentId = id;
    const seen = new Set<string>();

    while (!seen.has(currentId) && aliasMapRef.current.has(currentId)) {
      seen.add(currentId);
      currentId = aliasMapRef.current.get(currentId) ?? currentId;
    }

    return currentId;
  }, []);

  const setAlias = useCallback((fromId: string, toId: string) => {
    aliasMapRef.current.set(fromId, toId);
  }, []);

  const deleteAlias = useCallback((id: string) => {
    aliasMapRef.current.delete(id);
  }, []);

  const deleteAliasesTo = useCallback((targetId: string) => {
    for (const [key, value] of aliasMapRef.current.entries()) {
      if (value === targetId) {
        aliasMapRef.current.delete(key);
      }
    }
  }, []);

  return { aliasMapRef, resolveToastId, setAlias, deleteAlias, deleteAliasesTo };
}
