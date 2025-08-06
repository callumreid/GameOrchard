package com.microgamis.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "MicKey")
public class MicKeyPlugin extends Plugin {

    private static MicKeyPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
    }

    public static MicKeyPlugin getInstance() {
        return instance;
    }

    public void dispatchKeyEvent(String type) {
        JSObject payload = new JSObject();
        payload.put("type", type);
        notifyListeners("micKey", payload);
    }
}
