# Alligator
Complete set of desktop widgets with a brutalist acid theme.

## Development (Nix)
1. `nix develop`
2. `ags -c ./src/config.ts`
3. `ags toggle sidebar`

## NixOS integration (flake)
Add this repo as an input, then link the `src` folder into your user config and ensure `ags` is installed.

```nix
{
  inputs.alligator.url = "path:/home/you/Projects/alligator";

  outputs = { self, nixpkgs, home-manager, alligator, ... }: {
    home-manager.users.you = { pkgs, ... }: {
      home.packages = [ pkgs.ags ];
      xdg.configFile."ags".source = alligator + "/src";
    };
  };
}
```
