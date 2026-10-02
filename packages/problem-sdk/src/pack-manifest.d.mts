export interface PackManifest {
  schemaVersion: "0.1";
  id: string;
  version: string;
  title: string;
  publisher: string;
  description: string;
  license: string;
  problems: { id: string; module: string; renderer: string }[];
  renderers: { id: string; module: string }[];
}
export declare class PackManifestError extends Error {}
export declare function validatePackManifest(
  raw: unknown,
): Readonly<PackManifest>;
