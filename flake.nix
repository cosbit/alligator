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
        lib = pkgs.lib;

        giPath = lib.makeSearchPath "lib/girepository-1.0" [
          pkgs.gtk4
          pkgs.gtk4-layer-shell
          pkgs.astal.astal4

          pkgs.graphene

          pkgs.gdk-pixbuf
          pkgs.pango
          pkgs.glib
          pkgs.harfbuzz
        ];

        xdgDataPath = lib.makeSearchPath "share" [
          pkgs.gsettings-desktop-schemas
          pkgs.shared-mime-info
          pkgs.hicolor-icon-theme
          pkgs.adwaita-icon-theme
        ];

        gsettingsSchemaPath = lib.makeSearchPath "share/gsettings-schemas" [
          pkgs.gsettings-desktop-schemas
          pkgs.gtk4
        ];

        runtimePath = lib.makeBinPath [
          pkgs.bash
          pkgs.coreutils
        ];

        alligator = pkgs.stdenvNoCC.mkDerivation {
          pname = "alligator";
          version = "0.1.0";
          src = ./.;

          strictDeps = true;
          dontConfigure = true;
          dontBuild = true;

          installPhase = ''
            runHook preInstall

            mkdir -p "$out/bin" "$out/share/alligator"
            cp -r src "$out/share/alligator/"

            # Keep a top-level icons path for AGS configs that resolve icons relative
            # to the working directory instead of the script directory.
            ln -s "$out/share/alligator/src/icons" "$out/share/alligator/icons"

            if [ -d icons ]; then
              cp -r icons "$out/share/alligator/"
            fi

            if ! find "$out/share/alligator/src/icons" -maxdepth 1 -name '*.svg' -print -quit | grep -q .; then
              echo "warning: no SVG icons were packaged from src/icons. Nix flakes only include tracked files; commit src/icons/*.svg so nix build/nix run can load the custom numeric icons." >&2
            fi

            cat > "$out/share/alligator/src/package.json" <<'EOF'
            {
              "name": "astal-shell",
              "dependencies": {
                "astal": "${pkgs.astal.gjs}/share/astal/gjs"
              }
            }
            EOF

            cat > "$out/bin/alligator" <<EOF
            #!${pkgs.runtimeShell}
            export PATH="${runtimePath}:\''${PATH:-}"
            export GI_TYPELIB_PATH="${giPath}:\''${GI_TYPELIB_PATH:-}"
            export XDG_DATA_DIRS="${xdgDataPath}:\''${XDG_DATA_DIRS:-}"
            export GSETTINGS_SCHEMA_DIR="${gsettingsSchemaPath}:\''${GSETTINGS_SCHEMA_DIR:-}"

            unset GTK_THEME
            unset GTK_DATA_PREFIX
            unset GTK_PATH

            cd "$out/share/alligator"
            exec ${pkgs.ags}/bin/ags run --gtk4 ./src/app.ts "\$@"
            EOF
            chmod +x "$out/bin/alligator"

            runHook postInstall
          '';

          meta = {
            description = "Alligator AGS widget launcher";
            mainProgram = "alligator";
            platforms = lib.platforms.linux;
          };
        };
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

        packages.alligator = alligator;
        packages.default = alligator;

        apps.default = flake-utils.lib.mkApp {
          drv = alligator;
        };

      }
    );
}
