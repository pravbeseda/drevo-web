# Legacy backend (Yii1)

The Angular client talks to a Yii1 application that predates it. The source is reachable through a symlink:

```
legacy-drevo-yii/            # Symlink → ~/WebProjects/drevo/drevo-yii
  protected/
    controllers/api/         # API controllers — the only folder this project modifies
    models/                  # Data models — read them for data structures and business logic
```

## Policy

New endpoints go into `protected/controllers/api/`. Existing code stays as it is: the legacy app still serves its own users, and a change there ships to them as well as to the client.

`protected/models/` is the reference for what the data actually looks like — the DTO types on the Angular side often claim more than the backend guarantees, which is why the `no-unnecessary-condition` warnings around API responses are load-bearing rather than noise.

## Tests

The Yii suite runs from the legacy checkout with `./vendor/bin/phpunit`. Its tests duck-type ActiveRecord through `stdClass`, so service methods take no strict `?Users` hints and optional columns need a `?? default` guard.
