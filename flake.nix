{
  description = "Radiology Reporting Suite development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];
      forAllSystems = f:
        nixpkgs.lib.genAttrs systems (system: f (import nixpkgs { inherit system; }));
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          # Pinned toolchain so every contributor and CI runs the same versions.
          # Nothing is installed globally: enter with `nix develop` (or direnv).
          packages = [
            pkgs.nodejs_22
            pkgs.pnpm
            pkgs.supabase-cli
            pkgs.git
          ];

          shellHook = ''
            echo "Radiology Suite dev shell"
            echo "  node     $(node --version)"
            echo "  pnpm     $(pnpm --version)"
            echo "  supabase $(supabase --version 2>/dev/null || echo 'n/a')"
          '';
        };
      });
    };
}
