{
  description = "Alligator AGS widgets dev environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            ags
            gjs
            gtk3
            nodejs_20
            nodePackages.typescript
            nodePackages.typescript-language-server
          ];

          shellHook = ''
            echo "Alligator dev shell: run 'ags -c ./src/config.ts'"
          '';
        };
      });
}
