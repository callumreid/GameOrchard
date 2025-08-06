package com.microgamis.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.util.Log;

import com.microgamis.app.AudioRouterPlugin;
import com.microgamis.app.AudioInputPlugin;
import com.microgamis.app.MicKeyPlugin;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    // Fire-TV microphone key codes across OS versions
    private static final int MIC_KEY_LEGACY = 84; // Pre-P
    private static final int MIC_KEY_FIRE_OS_6 = 319; // Fire OS 6 (Android 7)
    private static final int MIC_KEY_FIRE_OS_7_PLUS = 322; // Fire OS 7+ (Android 9+)
    private static final int SPACE_KEY = 62;

    private boolean isMicKey(int keyCode) {
        return keyCode == MIC_KEY_LEGACY || keyCode == MIC_KEY_FIRE_OS_6 || keyCode == MIC_KEY_FIRE_OS_7_PLUS
                || keyCode == SPACE_KEY;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Register our custom plugins so the JS side can call them
        registerPlugin(AudioRouterPlugin.class);
        registerPlugin(AudioInputPlugin.class);
        registerPlugin(MicKeyPlugin.class);
        super.onCreate(savedInstanceState);
    }

    private void dispatchMicEvent(String type) {
        Log.d(TAG, "Dispatching mic event: " + type);
        MicKeyPlugin plugin = MicKeyPlugin.getInstance();
        if (plugin != null) {
            plugin.dispatchKeyEvent(type);
        } else {
            Log.w(TAG, "MicKeyPlugin instance is null");
        }
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();

        if (isMicKey(keyCode)) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                // Only trigger on the first keydown, ignore repeats
                if (event.getRepeatCount() == 0) {
                    Log.d(TAG, "Mic key down detected via dispatchKeyEvent: " + keyCode);
                    dispatchMicEvent("down");
                }
                return true; // consume event, prevent Alexa overlay
            } else if (event.getAction() == KeyEvent.ACTION_UP) {
                Log.d(TAG, "Mic key up detected via dispatchKeyEvent: " + keyCode);
                dispatchMicEvent("up");
                return true;
            }
        }

        return super.dispatchKeyEvent(event);
    }

    @Override
    public boolean onSearchRequested() {
        // Prevent Fire TV from launching Alexa overlay when mic button is pressed
        // Returning true tells the system "I handled the search request"
        Log.d(TAG, "Search request intercepted - preventing Alexa overlay");
        return true;
    }
}
