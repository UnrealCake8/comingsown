# Chrome launch failure in the VM

Confirmed by launching `google-chrome` from Konsole in VM1 on 23 October 2026:

```text
Failed to move to new namespace: PID namespaces supported,
Network namespace supported, but failed: errno = Operation not permitted
FATAL: ...zygote_host_impl_linux.cc: Zygote process exited prematurely with exit code 1
```

Chrome exits before creating a browser window. The same terminal output also reports that no DRM render device was found; the fatal error is the blocked namespace operation.

This is a VM/container-host configuration issue. Updating the Mao frontend or reloading the web desktop cannot grant the missing kernel/container permissions. The host administrator needs to review the container's namespace/sandbox configuration and applicable security policy so Chrome can run with its sandbox enabled. Review the actual Mac/OrbStack container configuration before changing it; the app repository does not contain that configuration.

No Chrome sandbox protections were disabled, no privileged container settings were applied, and no host configuration was changed during diagnosis. Do not treat `--no-sandbox` as a production fix for a shared cloud PC.

After correcting the host configuration, verify Chrome both from the taskbar and by running `google-chrome` as the normal desktop user in Konsole. Confirm that a window opens, a regular webpage loads, and Chrome still works after reconnecting the PC view. Repeat for each VM image/container affected.
