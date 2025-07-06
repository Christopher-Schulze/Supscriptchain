# Todo für User

Mit `npm run devstack` lässt sich die komplette Entwicklungsumgebung starten. Das Skript ruft Hardhat, den Subgraph-Server und das Frontend parallel über `concurrently` auf.

```bash
npm run devstack
```

Beende alle Prozesse gemeinsam mit `Ctrl+C`.
Der Subgraph-Server beendet dabei jetzt auch `graph-node` sauber.

Um Build- und generierte Dateien zu entfernen, hilft
```bash
npm run clean
```
