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

        giPath = pkgs.lib.makeSearchPath "lib/girepository-1.0" [
          pkgs.gtk4
          pkgs.gtk4-layer-shell
          pkgs.astal.astal4

          pkgs.graphene

          pkgs.gdk-pixbuf
          pkgs.pango
          pkgs.glib
          pkgs.harfbuzz
        ];
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            ags
            gjs

            gtk4
            gtk4-layer-shell
            astal.astal4
            graphene

            nodejs_20
            nodePackages.typescript
            nodePackages.typescript-language-server
          ];

          shellHook = ''
            export GI_TYPELIB_PATH="${giPath}:$GI_TYPELIB_PATH"

            # these aren’t strictly required for the Gdk error, but usually avoid later GTK runtime issues
            export XDG_DATA_DIRS="${pkgs.lib.makeSearchPath "share" [
              pkgs.gsettings-desktop-schemas
              pkgs.shared-mime-info
              pkgs.hicolor-icon-theme
            ]}:$XDG_DATA_DIRS"

            export GSETTINGS_SCHEMA_DIR="${pkgs.lib.makeSearchPath "share/gsettings-schemas" [
              pkgs.gsettings-desktop-schemas
              pkgs.gtk4
            ]}"

            unset GTK_THEME
            unset GTK_DATA_PREFIX
            unset GTK_PATH

            ags run --gtk4 ./src/app.ts
          '';
        };

      }
    );
}
