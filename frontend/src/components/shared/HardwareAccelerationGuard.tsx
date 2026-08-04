import React from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Link,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useHardwareAcceleration } from '@/hooks/useHardwareAcceleration';

interface HardwareAccelerationGuardProps {
  children: React.ReactNode;
  title?: string;
}

interface InstructionStep {
  title: string;
  description?: React.ReactNode;
  code?: string;
  link?: { label: string; href: string };
  subSteps?: string[];
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (/brave/i.test(ua) && typeof (navigator as any).brave !== 'undefined') return 'Brave';
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/chromium/i.test(ua)) return 'Chromium';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  return 'your browser';
}

function getEnableInstructions(browser: string): InstructionStep[] {
  if (browser === 'Brave' || browser === 'Chrome' || browser === 'Chromium' || browser === 'Edge') {
    const protocol = browser === 'Brave' ? 'brave' : browser === 'Edge' ? 'edge' : 'chrome';
    const settingsLink = `${protocol}://settings/system`;
    const flagsLink = `${protocol}://flags`;
    return [
      {
        title: 'Verify WebGL support',
        description: (
          <>
            Visit{' '}
            <Link href="https://get.webgl.org" target="_blank" rel="noopener noreferrer">
              get.webgl.org
            </Link>
            {' '}to see if your browser supports WebGL.
          </>
        ),
      },
      {
        title: 'Enable hardware acceleration',
        description: (
          <>
            Open{' '}
            <Link href={settingsLink} target="_blank" rel="noopener noreferrer">
              {settingsLink}
            </Link>
            {' '}and turn on the <strong>Use hardware acceleration when available</strong> option. Then click Relaunch.
          </>
        ),
      },
      {
        title: 'Enable GPU flags',
        description: (
          <>
            Open{' '}
            <Link href={flagsLink} target="_blank" rel="noopener noreferrer">
              {flagsLink}
            </Link>
            {' '}and enable:
          </>
        ),
        subSteps: [
          'Override software rendering list',
          'GPU rasterization',
          'Hardware-accelerated video decode',
        ],
      },
      {
        title: 'Relaunch browser',
        description: `Restart ${browser} completely, then reload this page.`,
      },
    ];
  }

  if (browser === 'Firefox') {
    const prefsLink = 'about:preferences#tabsBrowsing';
    return [
      {
        title: 'Verify WebGL support',
        description: (
          <>
            Visit{' '}
            <Link href="https://get.webgl.org" target="_blank" rel="noopener noreferrer">
              get.webgl.org
            </Link>
            {' '}to see if your browser supports WebGL.
          </>
        ),
      },
      {
        title: 'Enable hardware acceleration',
        description: (
          <>
            Go to the{' '}
            <Link href={prefsLink} target="_blank" rel="noopener noreferrer">
              {prefsLink}
            </Link>{' '}
            and Go the <strong>Performance</strong> section, then:
          </>
        ),
        subSteps: ['Uncheck “Use recommended performance settings”', 'Check “Use hardware acceleration when available'],
      },
      {
        title: 'WebGL preferences',
        description: (
          <>
            Go to the{' '}
            <Link href={'about:config'} target="_blank" rel="noopener noreferrer">
              {'about:config'}
            </Link>{' '}
            and search and set values for these preferences:.
          </>
        ),
        subSteps: ['webgl.disabled = false', 'webgl.enable-webgl2 = true'],
      },
      {
        title: 'Restart Firefox',
        description: 'Restart Firefox completely, then reload this page.',
      },
    ];
  }

  if (browser === 'Safari') {
    return [
      {
        title: 'Check WebGL support',
        description: (
          <>
            Visit{' '}
            <Link href="https://get.webgl.org" target="_blank" rel="noopener noreferrer">
              get.webgl.org
            </Link>{' '}
            to check WebGL support in Safari.
          </>
        ),
        link: { label: 'get.webgl.org', href: 'https://get.webgl.org' },
      },
      {
        title: 'Enable WebGL',
        description: 'Open Safari → Settings → Advanced → enable “Show features for web developers”.',
      },
      {
        title: 'Experimental features',
        description: 'Open Develop → Experimental Features and enable WebGL options.',
      },
      {
        title: 'Restart Safari',
        description: 'Restart Safari, then reload this page.',
      },
    ];
  }

  return [
    {
      title: 'Check WebGL support',
      description: (
        <>
          Visit{' '}
          <Link href="https://get.webgl.org" target="_blank" rel="noopener noreferrer">
            get.webgl.org
          </Link>{' '}
          to see if your browser supports WebGL.
        </>
      ),
      link: { label: 'get.webgl.org', href: 'https://get.webgl.org' },
    },
    {
      title: 'Enable hardware acceleration',
      description: 'Enable hardware acceleration / graphics acceleration in your browser settings, and make sure WebGL is not disabled.',
    },
    {
      title: 'Restart and reload',
      description: 'Restart the browser completely, then reload this page.',
    },
  ];
}

const HardwareAccelerationGuard: React.FC<HardwareAccelerationGuardProps> = ({
  children,
  title = 'Visualization unavailable',
}) => {
  const { supported, dismissed, dismiss } = useHardwareAcceleration();

  if (supported) {
    return <>{children}</>;
  }

  if (dismissed) {
    return (
      <Alert severity="warning" sx={{ m: 1 }}>
        <AlertTitle>Visualization unavailable — WebGL may be disabled</AlertTitle>
        WebGL is not available in this browser. Restart the browser after enabling hardware acceleration to restore charts.
      </Alert>
    );
  }

  const browser = getBrowserName();
  const steps = getEnableInstructions(browser);

  return (
    <Card
      sx={{
        m: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>

        <Alert severity="error">
          <AlertTitle>WebGL is not available or is disabled in {browser}</AlertTitle>
          <Typography variant="body2">
            This visualization uses WebGL (via deck.gl / plotly). Please verify support at get.webgl.org and enable hardware
            acceleration using the steps below, then reload this page.
          </Typography>
        </Alert>

        <List dense disablePadding>
          {steps.map((step, idx) => (
            <ListItem
              key={idx}
              sx={{
                alignItems: 'flex-start',
                gap: 1.5,
                pl: 0,
                pr: 0,
              }}
            >
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                {idx + 1}
              </Box>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {step.title}
                      </Typography>
                    </Box>
                    {step.description && (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {step.description}
                      </Typography>
                    )}
                    {step.subSteps && (
                      <List dense disablePadding sx={{ pl: 2.5 }}>
                        {step.subSteps.map((sub, subIdx) => (
                          <ListItem
                            key={subIdx}
                            sx={{
                              display: 'list-item',
                              listStyleType: 'disc',
                              pl: 1,
                              py: 0.25,
                            }}
                          >
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                  {sub}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={dismiss}>
            Got it — hide for this session
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HardwareAccelerationGuard;
