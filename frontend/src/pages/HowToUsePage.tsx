import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Alert,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface TocItem {
  id: string;
  label: string;
}

const tocItems: TocItem[] = [
  { id: 'workflow-overview', label: 'Workflow Overview' },
  { id: 'preparing-datasets', label: 'Preparing Datasets' },
  { id: 'uploading-dataset', label: 'Uploading Datasets' },
  { id: 'creating-analysis', label: 'Creating an Analysis' },
  { id: "manual-tissue-annotation", label: 'Manual Tissue Annotation' },
  { id: 'uploading-precomputed-results', label: 'Uploading Precomputed Results' },
  { id: 'single-method-result-exploration', label: 'Single-Method Result Exploration' },
  { id: 'comparison-interface', label: 'Comparison Interface' },
  { id: 'consensus-agreement-analysis', label: 'Consensus and Agreement Analysis' },
  { id: 'exporting-results', label: 'Exporting Results' },
];

const HowToUsePage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('workflow-overview');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      
      for (const item of tocItems) {
        const element = document.getElementById(item.id);
        if (element) {
          const offsetTop = element.offsetTop;
          const height = element.offsetHeight;
          
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + height) {
            setActiveSection(item.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      setTimeout(() => scrollToSection(hash), 100);
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Box sx={{ display: 'flex' }}>
        {/* Sticky Table of Contents - Desktop Only */}
        <Box
          sx={{
            width: 280,
            borderRight: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            p: 3,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: '14px' }}>
            Table of Contents
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflow: 'auto', pr: 1 }}>
            {tocItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                style={{
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  border: 'none',
                  background: activeSection === item.id ? '#0D9488' : 'transparent',
                  color: activeSection === item.id ? '#FFFFFF' : '#64748B',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {item.label}
              </button>
            ))}
          </Box>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ mt: 'auto' }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{
                color: '#0D9488',
                textTransform: 'none',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              Back
            </Button>
          </Box>
        </Box>

        {/* Main Content */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
          }}
          className="workspace-scroll"
        >
          <Container maxWidth="lg" sx={{ py: 6, maxWidth: '1100px !important' }}>
            {/* Page Title */}
            <Box sx={{ mb: 6 }}>
              <Typography variant="h1" sx={{ fontWeight: 700, mb: 2, fontSize: '2.5rem' }}>
                How to Use
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: '700px' }}>
                This guide walks through the complete workflow for analyzing spatial transcriptomics datasets using the platform. Users can either execute one of the integrated spatial domain identification methods or upload precomputed prediction results generated by external tools. Both workflows ultimately support the same visualization, evaluation, and comparison interfaces.
              </Typography>
            </Box>

            {/* Section 1: Workflow Overview */}
            <Box id="workflow-overview" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Workflow Overview
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                The platform follows a simple workflow consisting of dataset upload, analysis, visualization, and comparison. Depending on the use case, users may either execute an integrated method or upload prediction results generated elsewhere.
              </Typography>
              
              {/* Workflow illustration */}
              <Paper sx={{ mb: 3, p: 4, borderRadius: 2 }}>
                <Box
                  component="img"
                  src="/screenshots/fig-1_over_view.png"
                  alt="Workflow illustration"
                  sx={{
                    width: '100%',
                    borderRadius: 1,
                    display: 'block',
                  }}
                />
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                  Figure 1: Complete platform workflow
                </Typography>
              </Paper>

              {/* Numbered workflow summary */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    1
                  </Box>
                  <Typography variant="body2">Upload one or more datasets.</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    2
                  </Box>
                  <Typography variant="body2">Choose between executing an integrated method or uploading precomputed results.</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    3
                  </Box>
                  <Typography variant="body2">Explore individual execution results.</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    4
                  </Box>
                  <Typography variant="body2">Compare multiple methods.</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    5
                  </Box>
                  <Typography variant="body2">Analyze consensus and agreement across methods.</Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Section 2: Preparing Datasets */}
            <Box id="preparing-datasets" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Preparing Datasets
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Before running any analysis, users must upload one or more spatial transcriptomics datasets. Uploaded datasets are reused throughout the session and can be analyzed using multiple methods or compared with externally generated results.
              </Typography>

              <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Box sx={{ p: 3, pb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.125rem' }}>
                    Supported Dataset Structure
                  </Typography>
                </Box>
                <Box
                  component="pre"
                  sx={{
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                    p: 3,
                    m: 0,
                    overflow: 'auto',
                    fontSize: '0.8125rem',
                    fontFamily: 'monospace',
                    lineHeight: 1.8,
                    borderBottomLeftRadius: 8,
                    borderBottomRightRadius: 8,
                  }}
                >
                  <code>
                    dataset_name.zip:{'\n'}
                    ├── filtered_feature_bc_matrix.h5:{'\n'}
                    └── spatial:{'\n'}
                    &nbsp;&nbsp;&nbsp;&nbsp;├── tissue_positions_list.csv (or tissue_positions.csv):{'\n'}
                    &nbsp;&nbsp;&nbsp;&nbsp;├── tissue_lowres_image.png:{'\n'}
                    &nbsp;&nbsp;&nbsp;&nbsp;├── tissue_hires_image.png:{'\n'}
                    &nbsp;&nbsp;&nbsp;&nbsp;├── tissue_fullres_image.tiff:{'\n'}
                    &nbsp;&nbsp;&nbsp;&nbsp;└── scalefactors_json.json
                  </code>
                </Box>
              </Paper>

              <Paper sx={{ borderRadius: 2 }}>
                <Box sx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>File</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>
                            <code style={{ fontSize: '0.875rem' }}>
                              filtered_feature_bc_matrix.h5
                            </code>
                          </TableCell>
                          <TableCell>
                            Filtered gene expression matrix in 10x Genomics HDF5 format containing gene counts for all captured spatial spots.
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>
                            <code style={{ fontSize: '0.875rem' }}>
                              tissue_positions_list.csv
                            </code>
                          </TableCell>
                          <TableCell>
                            Spatial coordinates for each capture spot. Both <code>tissue_positions_list.csv</code> and <code>tissue_positions.csv</code> are supported.
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>
                            <code style={{ fontSize: '0.875rem' }}>
                              scalefactors_json.json
                            </code>
                          </TableCell>
                          <TableCell>
                            Scale factors required to align spatial coordinates with histology images.
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>
                            <code style={{ fontSize: '0.875rem' }}>
                              tissue_lowres_image.png
                            </code>
                          </TableCell>
                          <TableCell>
                            Low-resolution histology image used for visualization.
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>
                            <code style={{ fontSize: '0.875rem' }}>
                              tissue_hires_image.png
                            </code>
                          </TableCell>
                          <TableCell>
                            High-resolution histology image used for visualization and downstream analysis.
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>
                            <code style={{ fontSize: '0.875rem' }}>
                              tissue_fullres_image.tiff
                            </code>
                          </TableCell>
                          <TableCell>
                            Full-resolution histology image. <strong>Required only when image-based feature extraction is enabled.</strong>
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell>
                            <code style={{ fontSize: '0.875rem' }}>
                              dataset_name.h5ad
                            </code>
                          </TableCell>
                          <TableCell>
                            Standalone AnnData file accepted as an alternative input format to the zipped Space Ranger dataset.
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </Paper>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  All uploaded datasets are automatically validated before analysis begins.
                </Typography>
              </Alert>
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Section 3: Uploading Dataset */}
            <Box id="uploading-dataset" sx={{ mb: 6 }}>
              <Typography
                variant="h2"
                sx={{ fontWeight: 600, mb: 3, fontSize: "1.75rem" }}
              >
                Uploading Datasets
              </Typography>

              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                Dataset upload is the first step of every analysis workflow. Users may
                upload one or more spatial transcriptomics datasets, which are then reused
                throughout the session for both integrated method execution and
                precomputed result upload.
              </Typography>

              {/* ---------- Before Upload ---------- */}

              <Paper sx={{ mb: 2, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/before_dataset_upload.png"
                    alt="Dataset upload interface before upload"
                    sx={{
                      width: "100%",
                      borderRadius: 1,
                      display: "block",
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    color: "text.secondary",
                    pb: 2,
                  }}
                >
                  Figure 2. Dataset upload interface before any dataset has been uploaded.
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Before uploading any dataset, the interface provides the following
                components:
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>

                <Typography variant="body2">
                  <strong>(1) Dataset uploader:</strong> Drag-and-drop area for selecting
                  dataset ZIP files. Multiple datasets can be uploaded one after another,
                  and an upload progress indicator is displayed while each dataset is being
                  transferred and validated.
                </Typography>

                <Typography variant="body2">
                  <strong>(2) Create Experiment button:</strong> Starts the experiment
                  configuration workflow. This button remains disabled until at least one
                  dataset has been uploaded successfully.
                </Typography>

                <Typography variant="body2">
                  <strong>(3) Dataset status button:</strong> Displays the current dataset
                  status. Before upload it shows <code>Upload Required</code>. Once one or
                  more datasets have been uploaded, the label changes to{" "}
                  <code>Dataset Ready</code>. Clicking this button from anywhere in the
                  experiment interface always returns the user to the dataset upload step.
                </Typography>

              </Box>

              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                After successful validation, uploaded datasets are added to the dataset
                manager where they can be renamed, reviewed, or removed before proceeding
                with analysis.
              </Typography>

              {/* ---------- After Upload ---------- */}

              <Paper sx={{ mb: 2, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/after_dataset_upload.png"
                    alt="Dataset upload interface after upload"
                    sx={{
                      width: "100%",
                      borderRadius: 1,
                      display: "block",
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    textAlign: "center",
                    color: "text.secondary",
                    pb: 2,
                  }}
                >
                  Figure 3. Dataset management interface after successful upload.
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Successfully uploaded datasets are managed through the dataset table:
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

                <Typography variant="body2">
                  <strong>(1) Uploaded dataset table:</strong> Displays all validated
                  datasets together with their unique dataset identifiers, providing a
                  centralized view of every dataset available in the current session.
                </Typography>

                <Typography variant="body2">
                  <strong>(2) Dataset name editor:</strong> By default, each dataset is
                  named after its uploaded ZIP file. Users may rename a dataset by editing
                  the text field and pressing <strong>Enter</strong>, making it easier to
                  distinguish datasets during downstream analysis and comparison.
                </Typography>

                <Typography variant="body2">
                  <strong>(3) Delete dataset:</strong> Removes the selected dataset from
                  the current session together with any associated analysis results.
                </Typography>

                <Typography variant="body2">
                  <strong>(4) Create Experiment button:</strong> This button is active now because at least one dataset have been
                  uploded. Clicking it starts the experiment configuration workflow, allowing users to select tool and configure analysis parameters.
                </Typography>

              </Box>
            </Box>
            <Divider sx={{ my: 6 }} />

            {/* Section 4: Creating an Analysis */}
            <Box id="creating-analysis" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Creating an Analysis
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                Integrated spatial domain identification methods are executed through a three-step workflow:
                selecting a method, configuring execution parameters, and specifying stochastic runs before
                submitting the analysis.
              </Typography>

              {/* ---------------------------------------------------------------- */}
              {/* Step 1 */}
              {/* ---------------------------------------------------------------- */}

              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
                Step 1: Select a Method
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Select one of the integrated domain identification methods. After a method is selected,
                click <strong>Continue</strong> to proceed to the parameter configuration page.
              </Typography>

              <Paper sx={{ mb: 4, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/tool_selection.png"
                    alt="Method selection"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'text.secondary',
                    pb: 2,
                  }}
                >
                  Figure 6: Selecting an integrated analysis method.
                </Typography>
              </Paper>

              {/* ---------------------------------------------------------------- */}
              {/* Step 2 */}
              {/* ---------------------------------------------------------------- */}

              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
                Step 2: Configure Parameters
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                After entering the configuration page, users select the datasets to analyze and configure
                method-specific parameters. All parameters are automatically initialized with their default
                values.
              </Typography>

              <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/parameter_config.png"
                    alt="Parameter configuration"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'text.secondary',
                    pb: 2,
                  }}
                >
                  Figure 7: Parameter configuration interface.
                </Typography>
              </Paper>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    1.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Dataset selection.</strong> Select one or more datasets for analysis. Parameter
                    controls are rendered only after at least one dataset is selected. Multiple datasets may
                    be selected simultaneously. The currently focused dataset determines which parameter set
                    is displayed for editing, while unchanged parameters are shared across datasets.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    2.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Run and seed configuration.</strong> Opens the stochastic execution dialog where
                    the number of independent runs and their random seeds are specified. At least one seed
                    must be configured before the analysis can be submitted.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    3.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Basic parameters.</strong> Frequently used hyperparameters are shown by default
                    for convenient configuration.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    4.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Advanced parameters.</strong> Less frequently modified hyperparameters are grouped
                    separately to keep the interface compact.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    5.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Show/Hide Advanced Parameters.</strong> Expands or collapses the advanced
                    configuration section.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    6.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Create Experiment.</strong> This button remains disabled until at least one
                    random seed has been configured.
                  </Typography>
                </Box>
              </Box>

              <Alert severity="info" sx={{ mt: 4 ,mb: 5}}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Working with Multiple Datasets
                </Typography>

                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  The parameter configuration interface is designed to efficiently manage experiments involving multiple datasets.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="body2">
                    • Multiple dataset chips can be selected simultaneously, allowing the same method to be executed on several datasets in a single submission.
                  </Typography>

                  <Typography variant="body2">
                    • Clicking an unselected dataset chip both <strong>selects</strong> that dataset and makes it the <strong>active (focused)</strong> dataset.
                  </Typography>

                  <Typography variant="body2">
                    • Clicking another already selected dataset switches the focus to that dataset without changing the overall selection.
                  </Typography>

                  <Typography variant="body2">
                    • Clicking the currently focused dataset again removes it from the selection.
                  </Typography>

                  <Typography variant="body2">
                    • Only the parameters of the <strong>currently focused dataset</strong> are displayed in the configuration panel. This design allows dataset-specific parameters to be customized while keeping shared settings synchronized across all selected datasets.
                  </Typography>
                </Box>
              </Alert>

              {/* ---------------------------------------------------------------- */}
              {/* Step 3 */}
              {/* ---------------------------------------------------------------- */}

              <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
                Step 3: Configure Stochastic Runs
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                The run configuration dialog manages repeated executions. Click <strong>Add Run</strong> to
                create a new execution and enter a random seed for each run. The configured runs determine
                how many independent executions will be performed for every selected dataset.
              </Typography>

              <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/seed_setting.png"
                    alt="Run and seed configuration"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'text.secondary',
                    pb: 2,
                  }}
                >
                  Figure 8: Run and seed configuration dialog.
                </Typography>
              </Paper>
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Section 6: Manual Tissue Annotation */}
            <Box id="manual-tissue-annotation" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Manual Tissue Annotation
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Some integrated methods, such as ScribbleDom, require user-provided annotations to guide domain identification. The platform provides an interactive annotation interface that allows users to create, edit, and export tissue annotations directly within the web browser without relying on external software.
              </Typography>

              {/* Screenshot */}
              <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/fig-7_manual_annotation.png"
                    alt="Manual tissue annotation interface"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'text.secondary',
                    pb: 2,
                  }}
                >
                  Figure 5: Interactive manual tissue annotation interface
                </Typography>
              </Paper>

              {/* Numbered explanation */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    1.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Editing toolset.</strong> Provides a hand tool for navigating the histology image, a draw tool for creating annotations, an eraser for removing annotations, and undo/redo controls for correcting editing mistakes.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    2.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Label manager.</strong> Labels can be created, renamed, and selected from the management panel. A label must be selected before annotation can begin, ensuring every annotated spot is assigned to the correct domain.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    3.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Brush and visualization controls.</strong> The brush radius slider controls the annotation size, while the spot opacity slider adjusts the visibility of overlaid spots against the histology image, making it easier to validate selected regions.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    4.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Export and save.</strong> Annotations can be exported as a CSV file containing the spot barcode, label name, label ID, and spatial coordinates (<em>x</em>, <em>y</em>). Clicking <strong>Save Annotation</strong> stores the completed annotations and returns to the experiment configuration workflow.
                  </Typography>
                </Box>

              </Box>

              {/* <Alert severity="info" sx={{ mt: 4 }}>
                <Typography variant="body2">
                  <strong>Tip:</strong> Annotations exported from one session can later be imported into new experiments, eliminating the need to manually recreate scribbles for the same dataset.
                </Typography>
              </Alert> */}
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Section 5: Uploading Precomputed Results */}
            <Box id="uploading-precomputed-results" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Uploading Precomputed Results
              </Typography>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                In addition to executing the integrated methods, the platform also supports importing prediction results generated by external tools. After import, the uploaded results are evaluated using the same quality metrics as server-generated analyses and become fully compatible with every visualization and comparison feature provided by the web server.
              </Typography>

              {/* Screenshot */}
              <Paper sx={{ mb: 3, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/fig-6_result_upload.png"
                    alt="Precomputed result upload interface"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                </Box>

                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'center',
                    color: 'text.secondary',
                    pb: 2,
                  }}
                >
                  Figure 4: Importing precomputed prediction results
                </Typography>
              </Paper>

              {/* Numbered explanation */}
              <Box sx={{ display: 'flex', flexDirection: 'column', mb: 4, gap: 2 }}>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    1.
                  </Typography>
                  <Typography variant="body2">
                    Enter a <strong>tool name</strong> for the imported results. This name is used throughout the platform and allows externally generated predictions to be distinguished from the integrated methods during comparison.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    2.
                  </Typography>
                  <Typography variant="body2">
                    Select the corresponding <strong>dataset</strong> from the dropdown list. The uploaded prediction results will be associated with the selected dataset for all downstream analyses.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    3.
                  </Typography>
                  <Typography variant="body2">
                    Upload the result ZIP file using the drag-and-drop file picker. The uploader becomes active only after both a tool name and a dataset have been specified.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    4.
                  </Typography>
                  <Typography variant="body2">
                    Successfully validated imports appear in the results table. Individual imported results can be removed at any time using the delete icon before submission.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 24 }}>
                    5.
                  </Typography>
                  <Typography variant="body2">
                    Click <strong>Submit Import Experiment</strong> to finalize the import. Once submitted, the uploaded results are processed and become available in the same result pages and comparison workflows as analyses generated by the integrated methods.
                  </Typography>
                </Box>

              </Box>

              {/* Required Result ZIP Structure */}
              <Typography variant="h3" sx={{ fontWeight: 600, mb: 2, fontSize: '1.25rem' }}>
                Required Result ZIP Structure
              </Typography>
              <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  component="pre"
                  sx={{
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                    p: 3,
                    m: 0,
                    overflow: 'auto',
                    fontSize: '0.8125rem',
                    fontFamily: 'monospace',
                    lineHeight: 1.8,
                  }}
                >
                  <code>
                    result.zip:{'\n'}
                    ├── predictions.csv:{'\n'}
                    └── embedding.csv
                  </code>
                </Box>
              </Paper>

              <Paper sx={{ mb: 4, borderRadius: 2 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>File</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <code style={{ fontSize: '0.875rem' }}>predictions.csv</code>
                        </TableCell>
                        <TableCell>Predicted domain labels for every spatial spot.</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <code style={{ fontSize: '0.875rem' }}>embedding.csv</code>
                        </TableCell>
                        <TableCell>Low-dimensional embedding generated by the external method.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Expected predictions.csv Format */}
              <Typography variant="h3" sx={{ fontWeight: 600, mb: 2, fontSize: '1.25rem' }}>
                Expected predictions.csv Format
              </Typography>
              <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  component="pre"
                  sx={{
                    p: 3,
                    m: 0,
                    overflow: 'auto',
                    fontSize: '0.8125rem',
                    fontFamily: 'monospace',
                    lineHeight: 1.6,
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                  }}
                >
                  <code>
                    {'barcode,prediction\n'}
                    {'AAAC...,0\n'}
                    {'AAAG...,0\n'}
                    {'AAAT...,1\n'}
                  </code>
                </Box>
              </Paper>

              {/* Expected embedding.csv Format */}
              <Typography variant="h3" sx={{ fontWeight: 600, mb: 2, fontSize: '1.25rem' }}>
                Expected embedding.csv Format
              </Typography>
              <Paper sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
                <Box
                  component="pre"
                  sx={{
                    p: 3,
                    m: 0,
                    overflow: 'auto',
                    fontSize: '0.8125rem',
                    fontFamily: 'monospace',
                    lineHeight: 1.6,
                    backgroundColor: '#0F172A',
                    color: '#E2E8F0',
                  }}
                >
                  <code>
                    {'barcode,dim1,dim2,...,dimN\n'}
                    {'AAAC...,0.12,-1.43,...\n'}
                    {'AAAG...,0.55,-0.83,...\n'}
                  </code>
                </Box>
              </Paper>

              {/* Highlighted information card */}
              <Alert severity="success" sx={{ backgroundColor: '#F0FDF9', borderColor: '#BBF7D0' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Uploaded prediction results are rendered exactly like server-generated analyses and can be directly compared with integrated methods. This functionality is particularly useful for benchmarking newly developed algorithms.
                </Typography>
              </Alert>
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Section 6: Single-Method Result Exploration */}
            <Box id="single-method-result-exploration" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Single-Method Result Exploration
              </Typography>

              {/* Screenshot */}
              <Paper sx={{ mb: 4, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/fig-2_focus_view.png"
                    alt="Single-method result exploration"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', pb: 2 }}>
                  Figure 5: Single-method result exploration interface
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Each submitted analysis opens a dedicated result page with a permanent URL that can be bookmarked or shared.
              </Typography>

              {/* Two-column feature grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
                  gap: 3,
                }}
              >
                <FeatureCard title="Persistent execution URL" description="Each analysis gets a unique, shareable link that can be bookmarked." />
                <FeatureCard title="Execution status monitoring" description="Track job progress in real-time as it moves through queue to completion." />
                <FeatureCard title="Spatial domain visualization" description="Interactive spatial plots showing predicted domain assignments across tissue." />
                <FeatureCard title="Histology overlay" description="View predictions overlaid on the original tissue histology image." />
                <FeatureCard title="Interactive UMAP projection" description="Explore low-dimensional embeddings with interactive markers." />
                <FeatureCard title="Evaluation metrics" description="Access quantitative metrics for assessing prediction quality." />
                <FeatureCard title="Navigation sidebar" description="Quick access to datasets, runs, and comparison tools." />
                <FeatureCard title="Add-to-Compare shortcut" description="Add current result to comparison basket for side-by-side analysis." />
              </Box>
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Section 7: Comparison Interface */}
            <Box id="comparison-interface" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Comparison Interface
              </Typography>

              {/* Screenshot */}
              <Paper sx={{ mb: 4, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/fig-3_comparision.png"
                    alt="Comparison interface"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', pb: 2 }}>
                  Figure 6: Comparison workspace with coordinated tabs
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Selecting multiple methods activates the Compare button and opens the comparison workspace. The interface contains five coordinated analysis tabs.
              </Typography>

              {/* Five cards */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                  gap: 3,
                }}
              >
                <ComparisonCard
                  title="Side-By-Side Visualization"
                  description="Visual comparison of predicted domains across multiple methods."
                />
                <ComparisonCard
                  title="Metrics Comparison"
                  description="Average ± standard deviation tables together with comparative bar plots and box plots."
                />
                <ComparisonCard
                  title="Consensus Prediction"
                  description="Majority-vote spatial domains after label alignment."
                />
                <ComparisonCard
                  title="Paired Domain Comparison"
                  description="Detailed overlap analysis between two selected methods."
                />
                <ComparisonCard
                  title="Pie-Scatter Visualization"
                  description="Spot-level agreement without aggregation for detailed inspection."
                />
              </Box>
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Section 8: Consensus and Agreement Analysis */}
            <Box id="consensus-agreement-analysis" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Consensus and Agreement Analysis
              </Typography>

              {/* Screenshot */}
              <Paper sx={{ mb: 4, borderRadius: 2 }}>
                <Box sx={{ p: 2 }}>
                  <Box
                    component="img"
                    src="/screenshots/fig-4_consensus.png"
                    alt="Consensus and agreement analysis"
                    sx={{
                      width: '100%',
                      borderRadius: 1,
                      display: 'block',
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', pb: 2 }}>
                  Figure 7: Consensus and agreement visualizations
                </Typography>
              </Paper>

              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 4 }}>
                These visualizations become available after label alignment using the Hungarian algorithm.
              </Typography>

              {/* Three-column grid */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' },
                  gap: 3,
                  mb: 4,
                }}
              >
                <GridFeatureCard title="Consensus Map" description="Displays majority-vote spatial domains after label alignment." />
                <GridFeatureCard title="Confidence Heatmap" description="Highlights regions with high and low agreement across methods." />
                <GridFeatureCard title="Confidence Opacity View" description="Visualizes agreement using transparency overlay on tissue." />
              </Box>

              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Users can further inspect local disagreement through Pie-Scatter visualization and evaluate boundary consistency using Paired Domain Comparison together with Jaccard similarity statistics.
              </Typography>
            </Box>

            <Divider sx={{ my: 6 }} />

            {/* Section 9: Exporting Results */}
            <Box id="exporting-results" sx={{ mb: 6 }}>
              <Typography variant="h2" sx={{ fontWeight: 600, mb: 3, fontSize: '1.75rem' }}>
                Exporting Results
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                Most tables and visualizations generated by the platform can be exported for downstream analysis or publication.
              </Typography>

              {/* Checklist */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <ChecklistItem text="Evaluation metric tables" />
                <ChecklistItem text="Comparative plots" />
                <ChecklistItem text="Consensus statistics" />
                <ChecklistItem text="Annotation CSV files" />
                <ChecklistItem text="Prediction results" />
              </Box>
            </Box>
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

// Feature Card Component
interface FeatureCardProps {
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => (
  <Paper sx={{ borderRadius: 2 }}>
    <Box sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '0.95rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {description}
      </Typography>
    </Box>
  </Paper>
);

// Comparison Card Component
interface ComparisonCardProps {
  title: string;
  description: string;
}

const ComparisonCard: React.FC<ComparisonCardProps> = ({ title, description }) => (
  <Paper sx={{ borderRadius: 2 }}>
    <Box sx={{ p: 2.5 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '0.95rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
        {description}
      </Typography>
    </Box>
  </Paper>
);

// Grid Feature Card Component
const GridFeatureCard: React.FC<FeatureCardProps> = ({ title, description }) => (
  <Paper sx={{ borderRadius: 2, textAlign: 'center', p: 3 }}>
    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, fontSize: '1rem' }}>
      {title}
    </Typography>
    <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
      {description}
    </Typography>
  </Paper>
);

// Checklist Item Component
interface ChecklistItemProps {
  text: string;
}

const ChecklistItem: React.FC<ChecklistItemProps> = ({ text }) => (
  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
    <Box
      sx={{
        color: 'success.main',
        fontSize: '1.25rem',
        fontWeight: 700,
      }}
    >
      ✓
    </Box>
    <Typography variant="body2">{text}</Typography>
  </Box>
);

export default HowToUsePage;