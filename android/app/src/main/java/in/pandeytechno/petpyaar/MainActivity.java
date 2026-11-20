package in.pandeytechno.petpyaar;

import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpiPlugin.class);
        super.onCreate(savedInstanceState);

        // One native owner for system bars, cutouts and keyboard insets. The
        // WebView receives zero system-bar insets so CSS does not add them twice.
        WindowCompat.enableEdgeToEdge(getWindow());
        View decor = getWindow().getDecorView();
        decor.setBackgroundColor(Color.rgb(255, 247, 239));
        WindowCompat.getInsetsController(getWindow(), decor).setAppearanceLightStatusBars(true);
        WindowCompat.getInsetsController(getWindow(), decor).setAppearanceLightNavigationBars(true);
        ViewCompat.setOnApplyWindowInsetsListener(decor, (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, keyboard.bottom));
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout(), Insets.NONE)
                .build();
        });
        ViewCompat.requestApplyInsets(decor);
    }
}
