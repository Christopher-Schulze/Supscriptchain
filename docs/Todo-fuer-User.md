# Todo für User

Mit `npm run devstack` lässt sich die komplette Entwicklungsumgebung starten. Das Skript ruft Hardhat, den Subgraph-Server und das Frontend parallel über `concurrently` auf.

```bash
npm run devstack
```

Beende alle Prozesse gemeinsam mit `Ctrl+C`.

## CLI-Befehle

`scripts/cli.ts` fasst verschiedene Hardhat-Tasks zusammen. Starte das CLI mit

```bash
node scripts/cli.ts <befehl> [Optionen]
```

Beispiele für die neuen Kommandos:

```bash
# Vertrag pausieren
node scripts/cli.ts pause --network hardhat

# Vertrag wieder aktivieren
node scripts/cli.ts unpause --network hardhat

# Plan deaktivieren
node scripts/cli.ts disable --plan-id 0 --network hardhat

# Merchant für einen Plan ändern
node scripts/cli.ts update-merchant --plan-id 0 \
  --merchant 0xDEADBEEF... --network hardhat
```
