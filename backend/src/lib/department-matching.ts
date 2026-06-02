export type DepartmentIdentity = {
  name: string;
  code: string;
  course?: string | null;
};

export const normalizeDepartmentKey = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

const unique = (values: string[]): string[] => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeDepartmentKey(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const rawDepartmentAliases = (value: string | null | undefined): string[] => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return [];

  const aliases = [trimmed];
  const displayMatch = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (displayMatch) {
    aliases.push(displayMatch[1].trim(), displayMatch[2].trim());
  }

  return unique(aliases);
};

const departmentKeys = (department: DepartmentIdentity): string[] =>
  unique([department.name, department.code, department.course ?? '']).map(normalizeDepartmentKey);

export const departmentAliasesFor = (
  departments: DepartmentIdentity[],
  value: string | null | undefined,
): string[] => {
  const rawAliases = rawDepartmentAliases(value);
  const rawKeys = new Set(rawAliases.map(normalizeDepartmentKey));

  const matchedDepartment = departments.find((department) =>
    departmentKeys(department).some((key) => rawKeys.has(key)),
  );

  if (!matchedDepartment) {
    return rawAliases;
  }

  return unique([
    ...rawAliases,
    matchedDepartment.name,
    matchedDepartment.code,
    matchedDepartment.course ?? '',
  ]);
};

export const departmentsMatch = (
  departments: DepartmentIdentity[],
  left: string | null | undefined,
  right: string | null | undefined,
): boolean => {
  const leftKeys = new Set(departmentAliasesFor(departments, left).map(normalizeDepartmentKey));
  if (leftKeys.size === 0) return false;

  return departmentAliasesFor(departments, right).some((alias) =>
    leftKeys.has(normalizeDepartmentKey(alias)),
  );
};
